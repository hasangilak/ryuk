import { Router, Request, Response } from 'express';
import { Driver } from 'neo4j-driver';
import {
  KishotenketsuService,
  JoHaKyuService,
  CharacterNetworkService,
  PanelTransitionService,
  BidirectionalRelationshipService,
  GenreClassificationService,
  MangaValidationService,
} from '../../services/phase3';

export function createPhase3Router(driver: Driver): Router {
  const router = Router();

  const kishotenketsuService = new KishotenketsuService(driver);
  const johakyuService = new JoHaKyuService(driver);
  const characterNetworkService = new CharacterNetworkService(driver);
  const panelTransitionService = new PanelTransitionService(driver);
  const bidirectionalService = new BidirectionalRelationshipService(driver);
  const genreService = new GenreClassificationService(driver);
  const validationService = new MangaValidationService(driver);

  // =============================================================================
  // KISHŌTENKETSU ROUTES
  // =============================================================================

  // Ki routes
  router.post('/kishotenketsu/ki', async (req: Request, res: Response) => {
    try {
      const kiNode = await kishotenketsuService.createKiNode(req.body);
      return res.status(201).json(kiNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/kishotenketsu/ki/:id', async (req: Request, res: Response) => {
    try {
      const kiNode = await kishotenketsuService.getKiNode(req.params.id);
      if (!kiNode) {
        return res.status(404).json({ error: 'Ki node not found' });
      }
      return res.json(kiNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.put('/kishotenketsu/ki/:id', async (req: Request, res: Response) => {
    try {
      const kiNode = await kishotenketsuService.updateKiNode(req.params.id, req.body);
      return res.json(kiNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.delete('/kishotenketsu/ki/:id', async (req: Request, res: Response) => {
    try {
      await kishotenketsuService.deleteKiNode(req.params.id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Shō routes
  router.post('/kishotenketsu/sho', async (req: Request, res: Response) => {
    try {
      const shoNode = await kishotenketsuService.createShoNode(req.body);
      return res.status(201).json(shoNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/kishotenketsu/sho/:id', async (req: Request, res: Response) => {
    try {
      const shoNode = await kishotenketsuService.getShoNode(req.params.id);
      if (!shoNode) {
        return res.status(404).json({ error: 'Shō node not found' });
      }
      return res.json(shoNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Ten routes
  router.post('/kishotenketsu/ten', async (req: Request, res: Response) => {
    try {
      const tenNode = await kishotenketsuService.createTenNode(req.body);
      return res.status(201).json(tenNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/kishotenketsu/ten/:id', async (req: Request, res: Response) => {
    try {
      const tenNode = await kishotenketsuService.getTenNode(req.params.id);
      if (!tenNode) {
        return res.status(404).json({ error: 'Ten node not found' });
      }
      return res.json(tenNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Ketsu routes
  router.post('/kishotenketsu/ketsu', async (req: Request, res: Response) => {
    try {
      const ketsuNode = await kishotenketsuService.createKetsuNode(req.body);
      return res.status(201).json(ketsuNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/kishotenketsu/ketsu/:id', async (req: Request, res: Response) => {
    try {
      const ketsuNode = await kishotenketsuService.getKetsuNode(req.params.id);
      if (!ketsuNode) {
        return res.status(404).json({ error: 'Ketsu node not found' });
      }
      return res.json(ketsuNode);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Kishōtenketsu cycle routes
  router.get('/kishotenketsu/cycle/:storyId', async (req: Request, res: Response) => {
    try {
      const cycle = await kishotenketsuService.getKishotenketsuCycle(req.params.storyId);
      return res.json(cycle);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/kishotenketsu/validate/:storyId', async (req: Request, res: Response) => {
    try {
      const validation = await kishotenketsuService.validateKishotenketsuStructure(req.params.storyId);
      return res.json(validation);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // JO-HA-KYŪ ROUTES
  // =============================================================================

  router.post('/johakyu', async (req: Request, res: Response) => {
    try {
      const node = await johakyuService.createJoHaKyuNode(req.body);
      return res.status(201).json(node);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/johakyu/:id', async (req: Request, res: Response) => {
    try {
      const node = await johakyuService.getJoHaKyuNode(req.params.id);
      if (!node) {
        return res.status(404).json({ error: 'JoHaKyu node not found' });
      }
      return res.json(node);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.put('/johakyu/:id', async (req: Request, res: Response) => {
    try {
      const node = await johakyuService.updateJoHaKyuNode(req.params.id, req.body);
      return res.json(node);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.delete('/johakyu/:id', async (req: Request, res: Response) => {
    try {
      await johakyuService.deleteJoHaKyuNode(req.params.id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/johakyu/hierarchy/:storyId', async (req: Request, res: Response) => {
    try {
      const hierarchy = await johakyuService.getJoHaKyuHierarchy(req.params.storyId);
      return res.json(hierarchy);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/johakyu/analyze/:storyId', async (req: Request, res: Response) => {
    try {
      const analysis = await johakyuService.analyzeJoHaKyuPacing(req.params.storyId);
      return res.json(analysis);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/johakyu/cycle', async (req: Request, res: Response) => {
    try {
      const { storyId, parentNodeId, scale, title } = req.body;
      const cycle = await johakyuService.createJoHaKyuCycle(storyId, parentNodeId, scale, title);
      return res.status(201).json(cycle);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/johakyu/coordination/:nodeId', async (req: Request, res: Response) => {
    try {
      const coordination = await johakyuService.calculateFractalCoordination(req.params.nodeId);
      return res.json(coordination);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // CHARACTER NETWORK ROUTES
  // =============================================================================

  router.post('/character-network', async (req: Request, res: Response) => {
    try {
      const node = await characterNetworkService.createCharacterNetworkNode(req.body);
      return res.status(201).json(node);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/character-network/:id', async (req: Request, res: Response) => {
    try {
      const node = await characterNetworkService.getCharacterNetworkNode(req.params.id);
      if (!node) {
        return res.status(404).json({ error: 'Character network node not found' });
      }
      return res.json(node);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/character-network/character/:characterId', async (req: Request, res: Response) => {
    try {
      const node = await characterNetworkService.getCharacterNetworkByCharacter(req.params.characterId);
      if (!node) {
        return res.status(404).json({ error: 'Character network not found' });
      }
      return res.json(node);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.put('/character-network/:id', async (req: Request, res: Response) => {
    try {
      const node = await characterNetworkService.updateCharacterNetworkNode(req.params.id, req.body);
      return res.json(node);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.delete('/character-network/:id', async (req: Request, res: Response) => {
    try {
      await characterNetworkService.deleteCharacterNetworkNode(req.params.id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/character-network/analyze/:storyId', async (req: Request, res: Response) => {
    try {
      const { genre } = req.query;
      if (!genre || typeof genre !== 'string') {
        return res.status(400).json({ error: 'Genre query parameter required' });
      }
      const analysis = await characterNetworkService.analyzeStoryNetwork(req.params.storyId, genre as any);
      return res.json(analysis);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/character-network/centrality/:characterId/:storyId', async (req: Request, res: Response) => {
    try {
      const metrics = await characterNetworkService.calculateCentralityMetrics(
        req.params.characterId,
        req.params.storyId
      );
      return res.json(metrics);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/character-network/small-world/:characterId/:storyId', async (req: Request, res: Response) => {
    try {
      const metrics = await characterNetworkService.calculateSmallWorldMetrics(
        req.params.characterId,
        req.params.storyId
      );
      return res.json(metrics);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // PANEL TRANSITION ROUTES
  // =============================================================================

  router.post('/panel-transition', async (req: Request, res: Response) => {
    try {
      const transition = await panelTransitionService.createPanelTransition(req.body);
      return res.status(201).json(transition);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/panel-transition/:id', async (req: Request, res: Response) => {
    try {
      const transition = await panelTransitionService.getPanelTransition(req.params.id);
      if (!transition) {
        return res.status(404).json({ error: 'Panel transition not found' });
      }
      return res.json(transition);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.put('/panel-transition/:id', async (req: Request, res: Response) => {
    try {
      const transition = await panelTransitionService.updatePanelTransition(req.params.id, req.body);
      return res.json(transition);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.delete('/panel-transition/:id', async (req: Request, res: Response) => {
    try {
      await panelTransitionService.deletePanelTransition(req.params.id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/panel-transition/from/:contentId', async (req: Request, res: Response) => {
    try {
      const transitions = await panelTransitionService.getTransitionsFromContent(req.params.contentId);
      return res.json(transitions);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/panel-transition/to/:contentId', async (req: Request, res: Response) => {
    try {
      const transitions = await panelTransitionService.getTransitionsToContent(req.params.contentId);
      return res.json(transitions);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/panel-transition/analyze/:sceneId', async (req: Request, res: Response) => {
    try {
      const analysis = await panelTransitionService.analyzeTransitionFlow(req.params.sceneId);
      return res.json(analysis);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/panel-transition/validate/:transitionId', async (req: Request, res: Response) => {
    try {
      const validation = await panelTransitionService.validateTransition(req.params.transitionId);
      return res.json(validation);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/panel-transition/aspect-to-aspect', async (req: Request, res: Response) => {
    try {
      const { fromContentId, toContentId, aspectType, explorationDepth, atmosphericElements } = req.body;
      const transition = await panelTransitionService.createAspectToAspectTransition(
        fromContentId,
        toContentId,
        aspectType,
        explorationDepth,
        atmosphericElements
      );
      return res.status(201).json(transition);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/panel-transition/aspect-analysis/:sceneId', async (req: Request, res: Response) => {
    try {
      const analysis = await panelTransitionService.analyzeAspectExploration(req.params.sceneId);
      return res.json(analysis);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // BIDIRECTIONAL RELATIONSHIP ROUTES
  // =============================================================================

  router.post('/bidirectional-relationship', async (req: Request, res: Response) => {
    try {
      const relationship = await bidirectionalService.createBidirectionalRelationship(req.body);
      return res.status(201).json(relationship);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/bidirectional-relationship/apply/:tenNodeId', async (req: Request, res: Response) => {
    try {
      const result = await bidirectionalService.applyRetroactiveModification(req.params.tenNodeId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/bidirectional-relationship/recontextualize/:tenNodeId/:storyId', async (req: Request, res: Response) => {
    try {
      const result = await bidirectionalService.recontextualizeTimeline(req.params.tenNodeId, req.params.storyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/bidirectional-relationship/propagate/:tenNodeId', async (req: Request, res: Response) => {
    try {
      const { scope } = req.body;
      const result = await bidirectionalService.propagateRevelation(req.params.tenNodeId, scope);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/bidirectional-relationship/validate-setup/:tenNodeId', async (req: Request, res: Response) => {
    try {
      const result = await bidirectionalService.validateRevelationSetup(req.params.tenNodeId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/bidirectional-relationship/node/:nodeId', async (req: Request, res: Response) => {
    try {
      const relationships = await bidirectionalService.getBidirectionalRelationships(req.params.nodeId);
      return res.json(relationships);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // GENRE CLASSIFICATION ROUTES
  // =============================================================================

  router.get('/genre/classify/:storyId', async (req: Request, res: Response) => {
    try {
      const classification = await genreService.classifyStory(req.params.storyId);
      return res.json(classification);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/genre/validate/:storyId', async (req: Request, res: Response) => {
    try {
      const { targetGenre } = req.body;
      if (!targetGenre) {
        return res.status(400).json({ error: 'targetGenre is required' });
      }
      const validation = await genreService.validateGenreAuthenticity(req.params.storyId, targetGenre);
      return res.json(validation);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/genre/patterns/:storyId', async (req: Request, res: Response) => {
    try {
      const analysis = await genreService.analyzeNarrativePatterns(req.params.storyId);
      return res.json(analysis);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/genre/pattern-library', async (req: Request, res: Response) => {
    try {
      const { genre } = req.query;
      const library = genreService.getPatternLibrary(genre as any);
      return res.json(library);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // MANGA VALIDATION ROUTES
  // =============================================================================

  router.get('/validate/kishotenketsu/:storyId', async (req: Request, res: Response) => {
    try {
      const validation = await validationService.validateKishotenketsuStructure(req.params.storyId);
      return res.json(validation);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/validate/johakyu/:storyId', async (req: Request, res: Response) => {
    try {
      const validation = await validationService.validateJoHaKyuPacing(req.params.storyId);
      return res.json(validation);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/validate/character-network/:storyId', async (req: Request, res: Response) => {
    try {
      const { expectedGenre } = req.body;
      if (!expectedGenre) {
        return res.status(400).json({ error: 'expectedGenre is required' });
      }
      const validation = await validationService.validateCharacterNetwork(req.params.storyId, expectedGenre);
      return res.json(validation);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/validate/panel-transitions/:storyId', async (req: Request, res: Response) => {
    try {
      const validation = await validationService.validatePanelTransitions(req.params.storyId);
      return res.json(validation);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/validate/comprehensive/:storyId', async (req: Request, res: Response) => {
    try {
      const { genre } = req.body;
      if (!genre) {
        return res.status(400).json({ error: 'genre is required' });
      }
      const validation = await validationService.validateMangaStructure(req.params.storyId, genre);
      return res.json(validation);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // PHASE 3 STATUS & INFO
  // =============================================================================

  router.get('/status', (req: Request, res: Response) => {
    return res.json({
      phase: 'Phase 3 - Manga Narrative Structures',
      version: '3.0.0',
      features: {
        kishotenketsu: 'Complete four-act Japanese narrative structure',
        johakyu: 'Multi-resolution fractal pacing system',
        character_network: 'Genre-specific topology analysis (Shōnen/Shōjo)',
        panel_transitions: 'Complete McCloud taxonomy with aspect-to-aspect support',
        bidirectional_relationships: 'Retroactive semantic modification for twists',
        genre_classification: 'Automatic manga genre detection and validation',
        manga_validation: 'Comprehensive cultural authenticity validation',
      },
      status: 'operational',
    });
  });

  return router;
}