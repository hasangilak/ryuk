import { Router, Request, Response } from 'express';
import { Driver } from 'neo4j-driver';
import { CharacterStateService } from '../../services/phase4';

export function createPhase4Router(driver: Driver): Router {
  const router = Router();
  const stateService = new CharacterStateService(driver);

  router.post('/state', async (req: Request, res: Response) => {
    try {
      const state = await stateService.createCharacterState(req.body);
      return res.status(201).json(state);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/state/transition', async (req: Request, res: Response) => {
    try {
      const { characterId, fromStateId, toStateId, trigger } = req.body;
      const transition = await stateService.transitionState(characterId, fromStateId, toStateId, trigger);
      return res.json(transition);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/state/current/:characterId', async (req: Request, res: Response) => {
    try {
      const state = await stateService.getCurrentState(req.params.characterId);
      return res.json(state);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.post('/state/current/:characterId', async (req: Request, res: Response) => {
    try {
      const { stateId } = req.body;
      await stateService.setCurrentState(req.params.characterId, stateId);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/state/history/:characterId', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await stateService.getStateHistory(req.params.characterId, limit);
      return res.json(history);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  router.get('/status', (req: Request, res: Response) => {
    return res.json({
      phase: 'Phase 4 - Character State Management',
      version: '4.0.0',
      features: {
        hfsm: 'Hierarchical Finite State Machine for character states',
        state_transitions: 'Sophisticated state transition tracking',
        state_history: 'Complete character state timeline',
      },
      status: 'operational',
    });
  });

  return router;
}
