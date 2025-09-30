import { Driver } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

// Core Character State Management Service
// Implements HFSM (Hierarchical Finite State Machine) patterns
// for sophisticated character state tracking across narrative branches

export type StateType = 'behavioral' | 'emotional' | 'physical' | 'mental' | 'social';

export interface CharacterState {
  state_id: string;
  character_id: string;
  state_name: string;
  state_type: StateType;
  parent_state_id?: string;
  state_level: number;
  state_data: Record<string, any>;
  entry_conditions: string[];
  exit_conditions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface StateTransition {
  from_state_id: string;
  to_state_id: string;
  trigger: string;
  conditions: string[];
  timestamp: Date;
}

export class CharacterStateService {
  constructor(private driver: Driver) {}

  async createCharacterState(data: Omit<CharacterState, 'state_id' | 'created_at' | 'updated_at'>): Promise<CharacterState> {
    const session = this.driver.session();
    try {
      const state_id = uuidv4();
      const now = new Date();

      const result = await session.run(
        `CREATE (s:CharacterState {
          state_id: $state_id,
          character_id: $character_id,
          state_name: $state_name,
          state_type: $state_type,
          parent_state_id: $parent_state_id,
          state_level: $state_level,
          state_data: $state_data,
          entry_conditions: $entry_conditions,
          exit_conditions: $exit_conditions,
          created_at: datetime($created_at),
          updated_at: datetime($updated_at)
        })
        RETURN s`,
        {
          state_id,
          character_id: data.character_id,
          state_name: data.state_name,
          state_type: data.state_type,
          parent_state_id: data.parent_state_id || null,
          state_level: data.state_level,
          state_data: JSON.stringify(data.state_data),
          entry_conditions: JSON.stringify(data.entry_conditions),
          exit_conditions: JSON.stringify(data.exit_conditions),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }
      );

      return this.parseState(result.records[0].get('s').properties);
    } finally {
      await session.close();
    }
  }

  async transitionState(characterId: string, fromStateId: string, toStateId: string, trigger: string): Promise<StateTransition> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (from:CharacterState {state_id: $fromStateId, character_id: $characterId})
         MATCH (to:CharacterState {state_id: $toStateId, character_id: $characterId})
         CREATE (from)-[t:TRANSITIONS_TO {
           trigger: $trigger,
           timestamp: datetime($timestamp)
         }]->(to)
         RETURN t, from.state_id as from_id, to.state_id as to_id`,
        {
          characterId,
          fromStateId,
          toStateId,
          trigger,
          timestamp: new Date().toISOString(),
        }
      );

      if (result.records.length === 0) throw new Error('State transition failed');

      const record = result.records[0];
      return {
        from_state_id: record.get('from_id'),
        to_state_id: record.get('to_id'),
        trigger,
        conditions: [],
        timestamp: new Date(),
      };
    } finally {
      await session.close();
    }
  }

  async getCurrentState(characterId: string): Promise<CharacterState | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (c:Character {id: $characterId})-[:CURRENT_STATE]->(s:CharacterState)
         RETURN s`,
        { characterId }
      );

      if (result.records.length === 0) return null;
      return this.parseState(result.records[0].get('s').properties);
    } finally {
      await session.close();
    }
  }

  async setCurrentState(characterId: string, stateId: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MATCH (c:Character {id: $characterId})
         OPTIONAL MATCH (c)-[r:CURRENT_STATE]->()
         DELETE r
         WITH c
         MATCH (s:CharacterState {state_id: $stateId, character_id: $characterId})
         CREATE (c)-[:CURRENT_STATE]->(s)`,
        { characterId, stateId }
      );
    } finally {
      await session.close();
    }
  }

  async getStateHistory(characterId: string, limit: number = 50): Promise<StateTransition[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (from:CharacterState {character_id: $characterId})-[t:TRANSITIONS_TO]->(to:CharacterState)
         RETURN from.state_id as from_id, to.state_id as to_id, t.trigger as trigger, t.timestamp as timestamp
         ORDER BY t.timestamp DESC
         LIMIT $limit`,
        { characterId, limit }
      );

      return result.records.map(record => ({
        from_state_id: record.get('from_id'),
        to_state_id: record.get('to_id'),
        trigger: record.get('trigger'),
        conditions: [],
        timestamp: new Date(record.get('timestamp')),
      }));
    } finally {
      await session.close();
    }
  }

  private parseState(props: any): CharacterState {
    return {
      state_id: props.state_id,
      character_id: props.character_id,
      state_name: props.state_name,
      state_type: props.state_type,
      parent_state_id: props.parent_state_id,
      state_level: props.state_level,
      state_data: JSON.parse(props.state_data || '{}'),
      entry_conditions: JSON.parse(props.entry_conditions || '[]'),
      exit_conditions: JSON.parse(props.exit_conditions || '[]'),
      created_at: new Date(props.created_at),
      updated_at: new Date(props.updated_at),
    };
  }
}
