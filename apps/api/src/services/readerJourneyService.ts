import { Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../database/connections';
import { logger } from '../utils/logger';
import { DatabaseError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  ReaderSession,
  JourneyStep,
  JourneyPath,
  JourneyAnalytics,
} from '@ryuk/shared';

export interface CreateSessionRequest {
  reader_id: string;
  story_id: string;
  starting_node_id: string;
  session_metadata?: Record<string, any>;
}

export interface RecordStepRequest {
  session_id: string;
  from_node_id: string;
  to_node_id: string;
  step_type: 'scene_progression' | 'choice_selection' | 'backtrack' | 'jump';
  user_action: string;
  time_spent: number;
  step_metadata?: Record<string, any>;
}

export interface AnalyticsQuery {
  story_id?: string;
  reader_id?: string;
  start_date?: Date;
  end_date?: Date;
  node_ids?: string[];
}

export interface PopularPath {
  path_nodes: string[];
  traversal_count: number;
  avg_completion_time: number;
  satisfaction_score: number;
}

export class ReaderJourneyService {
  private driver = getNeo4jDriver();

  /**
   * Creates a new reader session for journey tracking
   */
  async createSession(request: CreateSessionRequest): Promise<ReaderSession> {
    const session = this.driver.session();
    try {
      const readerSession: ReaderSession = {
        id: crypto.randomUUID(),
        reader_id: request.reader_id,
        story_id: request.story_id,
        started_at: new Date(),
        last_activity: new Date(),
        current_node_id: request.starting_node_id,
        session_metadata: request.session_metadata || {},
      };

      // Create session node in Neo4j
      await session.run(
        `
        CREATE (rs:ReaderSession $properties)
        RETURN rs
        `,
        { properties: readerSession }
      );

      // Create initial relationship to starting node
      await session.run(
        `
        MATCH (rs:ReaderSession {id: $sessionId}), (n {id: $nodeId})
        CREATE (rs)-[:STARTED_AT {timestamp: datetime()}]->(n)
        `,
        {
          sessionId: readerSession.id,
          nodeId: request.starting_node_id,
        }
      );

      logger.info('Created reader session:', {
        sessionId: readerSession.id,
        readerId: request.reader_id,
        storyId: request.story_id,
      });

      return readerSession;
    } catch (error) {
      logger.error('Error creating reader session:', error);
      throw new DatabaseError('Failed to create reader session', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Records a step in the reader's journey
   */
  async recordJourneyStep(request: RecordStepRequest): Promise<JourneyStep> {
    const session = this.driver.session();
    try {
      const journeyStep: JourneyStep = {
        id: crypto.randomUUID(),
        session_id: request.session_id,
        from_node_id: request.from_node_id,
        to_node_id: request.to_node_id,
        step_type: request.step_type,
        timestamp: new Date(),
        time_spent: request.time_spent,
        user_action: request.user_action,
        step_metadata: request.step_metadata || {},
      };

      // Create journey step node
      await session.run(
        `
        CREATE (js:JourneyStep $properties)
        RETURN js
        `,
        { properties: journeyStep }
      );

      // Create relationships
      await session.run(
        `
        MATCH (js:JourneyStep {id: $stepId}),
              (rs:ReaderSession {id: $sessionId}),
              (from {id: $fromNodeId}),
              (to {id: $toNodeId})
        CREATE (rs)-[:HAS_STEP]->(js),
               (js)-[:FROM_NODE]->(from),
               (js)-[:TO_NODE]->(to)
        `,
        {
          stepId: journeyStep.id,
          sessionId: request.session_id,
          fromNodeId: request.from_node_id,
          toNodeId: request.to_node_id,
        }
      );

      // Update session's current node and last activity
      await session.run(
        `
        MATCH (rs:ReaderSession {id: $sessionId})
        SET rs.current_node_id = $currentNodeId,
            rs.last_activity = datetime()
        `,
        {
          sessionId: request.session_id,
          currentNodeId: request.to_node_id,
        }
      );

      // Track choice selections for analytics
      if (request.step_type === 'choice_selection') {
        await session.run(
          `
          MATCH (c:Choice {id: $fromNodeId})
          SET c.analytics_data = CASE
            WHEN c.analytics_data IS NULL THEN {selection_count: 1}
            ELSE apoc.map.setKey(c.analytics_data, 'selection_count',
                 coalesce(c.analytics_data.selection_count, 0) + 1)
          END
          `,
          { fromNodeId: request.from_node_id }
        );
      }

      logger.info('Recorded journey step:', {
        stepId: journeyStep.id,
        sessionId: request.session_id,
        stepType: request.step_type,
      });

      return journeyStep;
    } catch (error) {
      logger.error('Error recording journey step:', error);
      throw new DatabaseError('Failed to record journey step', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Completes a journey path and stores analytics
   */
  async completeJourneyPath(
    sessionId: string,
    pathRating: number,
    completionStatus: 'completed' | 'abandoned'
  ): Promise<JourneyPath> {
    const session = this.driver.session();
    try {
      // Get all steps for this session
      const stepsResult = await session.run(
        `
        MATCH (rs:ReaderSession {id: $sessionId})-[:HAS_STEP]->(js:JourneyStep)
        OPTIONAL MATCH (js)-[:FROM_NODE]->(from)
        OPTIONAL MATCH (js)-[:TO_NODE]->(to)
        RETURN js, from.id as from_id, to.id as to_id
        ORDER BY js.timestamp
        `,
        { sessionId }
      );

      const steps = stepsResult.records.map(record => ({
        step: record.get('js').properties,
        fromId: record.get('from_id'),
        toId: record.get('to_id'),
      }));

      if (steps.length === 0) {
        throw new NotFoundError(`No steps found for session ${sessionId}`);
      }

      // Calculate total duration
      const firstStep = steps[0].step;
      const lastStep = steps[steps.length - 1].step;
      const totalDuration = new Date(lastStep.timestamp).getTime() - new Date(firstStep.timestamp).getTime();

      // Extract path nodes and relationships
      const pathNodes = [steps[0].fromId, ...steps.map(s => s.toId)];
      const pathRelationships = steps.map(s => s.step.id);

      const journeyPath: JourneyPath = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        path_nodes: pathNodes,
        path_relationships: pathRelationships,
        total_duration: totalDuration,
        path_rating: pathRating,
        completion_status: completionStatus,
        path_metadata: {
          step_count: steps.length,
          avg_step_time: totalDuration / steps.length,
          choice_count: steps.filter(s => s.step.step_type === 'choice_selection').length,
          backtrack_count: steps.filter(s => s.step.step_type === 'backtrack').length,
        },
      };

      // Store journey path
      await session.run(
        `
        CREATE (jp:JourneyPath $properties)
        WITH jp
        MATCH (rs:ReaderSession {id: $sessionId})
        CREATE (rs)-[:COMPLETED_PATH]->(jp)
        `,
        {
          properties: journeyPath,
          sessionId,
        }
      );

      logger.info('Completed journey path:', {
        pathId: journeyPath.id,
        sessionId,
        completionStatus,
        duration: totalDuration,
      });

      return journeyPath;
    } catch (error) {
      logger.error('Error completing journey path:', error);
      throw new DatabaseError('Failed to complete journey path', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Gets comprehensive analytics for story engagement
   */
  async getJourneyAnalytics(query: AnalyticsQuery): Promise<JourneyAnalytics> {
    const session = this.driver.session();
    try {
      let whereConditions = [];
      let parameters: Record<string, any> = {};

      if (query.story_id) {
        whereConditions.push('rs.story_id = $storyId');
        parameters.storyId = query.story_id;
      }

      if (query.reader_id) {
        whereConditions.push('rs.reader_id = $readerId');
        parameters.readerId = query.reader_id;
      }

      if (query.start_date) {
        whereConditions.push('rs.started_at >= $startDate');
        parameters.startDate = query.start_date;
      }

      if (query.end_date) {
        whereConditions.push('rs.started_at <= $endDate');
        parameters.endDate = query.end_date;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get session count and average duration
      const sessionResult = await session.run(
        `
        MATCH (rs:ReaderSession)
        ${whereClause}
        OPTIONAL MATCH (rs)-[:COMPLETED_PATH]->(jp:JourneyPath)
        RETURN
          count(DISTINCT rs) as session_count,
          avg(jp.total_duration) as avg_session_duration
        `,
        parameters
      );

      const sessionStats = sessionResult.records[0];
      const sessionCount = sessionStats.get('session_count') || 0;
      const avgSessionDuration = sessionStats.get('avg_session_duration') || 0;

      // Get most popular paths
      const popularPathsResult = await session.run(
        `
        MATCH (rs:ReaderSession)-[:COMPLETED_PATH]->(jp:JourneyPath)
        ${whereClause}
        WITH jp.path_nodes as path, count(*) as path_count
        ORDER BY path_count DESC
        LIMIT 10
        RETURN collect(path) as most_popular_paths
        `,
        parameters
      );

      const mostPopularPaths = popularPathsResult.records[0]?.get('most_popular_paths') || [];

      // Get dropout points (nodes where many sessions end)
      const dropoutResult = await session.run(
        `
        MATCH (rs:ReaderSession)
        ${whereClause}
        MATCH (rs)-[:HAS_STEP]->(js:JourneyStep)
        WITH rs, max(js.timestamp) as last_step_time
        MATCH (rs)-[:HAS_STEP]->(js:JourneyStep)
        WHERE js.timestamp = last_step_time
        MATCH (js)-[:TO_NODE]->(n)
        WITH n.id as dropout_node, count(*) as dropout_count
        ORDER BY dropout_count DESC
        LIMIT 5
        RETURN collect(dropout_node) as dropout_points
        `,
        parameters
      );

      const dropoutPoints = dropoutResult.records[0]?.get('dropout_points') || [];

      // Get choice selection rates
      const choiceRatesResult = await session.run(
        `
        MATCH (c:Choice)
        WHERE c.analytics_data IS NOT NULL
        RETURN c.id as choice_id, c.analytics_data.selection_count as selections
        `,
        {}
      );

      const choiceSelectionRates: Record<string, number> = {};
      choiceRatesResult.records.forEach(record => {
        choiceSelectionRates[record.get('choice_id')] = record.get('selections') || 0;
      });

      // Get scene engagement scores (based on time spent)
      const engagementResult = await session.run(
        `
        MATCH (rs:ReaderSession)-[:HAS_STEP]->(js:JourneyStep)-[:TO_NODE]->(s:Scene)
        ${whereClause}
        WITH s.id as scene_id, avg(js.time_spent) as avg_time_spent
        RETURN scene_id, avg_time_spent
        `,
        parameters
      );

      const sceneEngagementScores: Record<string, number> = {};
      engagementResult.records.forEach(record => {
        const sceneId = record.get('scene_id');
        const avgTime = record.get('avg_time_spent') || 0;
        // Normalize to 0-1 scale (assuming 60 seconds is perfect engagement)
        sceneEngagementScores[sceneId] = Math.min(1.0, avgTime / 60000);
      });

      return {
        session_count: sessionCount,
        avg_session_duration: avgSessionDuration,
        most_popular_paths: mostPopularPaths,
        dropout_points: dropoutPoints,
        choice_selection_rates: choiceSelectionRates,
        scene_engagement_scores: sceneEngagementScores,
      };
    } catch (error) {
      logger.error('Error getting journey analytics:', error);
      throw new DatabaseError('Failed to get journey analytics', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Gets the current active session for a reader
   */
  async getActiveSession(readerId: string, storyId: string): Promise<ReaderSession | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (rs:ReaderSession {reader_id: $readerId, story_id: $storyId})
        WHERE NOT EXISTS((rs)-[:COMPLETED_PATH]->())
        RETURN rs
        ORDER BY rs.last_activity DESC
        LIMIT 1
        `,
        { readerId, storyId }
      );

      if (result.records.length === 0) {
        return null;
      }

      return result.records[0].get('rs').properties as ReaderSession;
    } catch (error) {
      logger.error('Error getting active session:', error);
      throw new DatabaseError('Failed to get active session', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Gets reader's journey history for a specific story
   */
  async getReaderJourneyHistory(
    readerId: string,
    storyId: string,
    limit: number = 10
  ): Promise<JourneyPath[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (rs:ReaderSession {reader_id: $readerId, story_id: $storyId})-[:COMPLETED_PATH]->(jp:JourneyPath)
        RETURN jp
        ORDER BY jp.path_metadata.completion_date DESC
        LIMIT $limit
        `,
        { readerId, storyId, limit }
      );

      return result.records.map(record => record.get('jp').properties as JourneyPath);
    } catch (error) {
      logger.error('Error getting reader journey history:', error);
      throw new DatabaseError('Failed to get reader journey history', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Identifies and analyzes popular convergent paths
   */
  async analyzePopularPaths(storyId: string): Promise<PopularPath[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (rs:ReaderSession {story_id: $storyId})-[:COMPLETED_PATH]->(jp:JourneyPath)
        WHERE jp.completion_status = 'completed'
        WITH jp.path_nodes as path,
             count(*) as traversal_count,
             avg(jp.total_duration) as avg_completion_time,
             avg(jp.path_rating) as satisfaction_score
        WHERE traversal_count >= 2
        ORDER BY traversal_count DESC, satisfaction_score DESC
        LIMIT 20
        RETURN path, traversal_count, avg_completion_time, satisfaction_score
        `,
        { storyId }
      );

      return result.records.map(record => ({
        path_nodes: record.get('path'),
        traversal_count: record.get('traversal_count'),
        avg_completion_time: record.get('avg_completion_time'),
        satisfaction_score: record.get('satisfaction_score'),
      }));
    } catch (error) {
      logger.error('Error analyzing popular paths:', error);
      throw new DatabaseError('Failed to analyze popular paths', error);
    } finally {
      await session.close();
    }
  }
}