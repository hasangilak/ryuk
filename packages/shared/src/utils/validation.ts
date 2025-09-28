import { z } from 'zod';
import {
  SceneNodeSchema,
  CharacterNodeSchema,
  ChoiceNodeSchema,
  EventNodeSchema,
  LocationNodeSchema,
  ItemNodeSchema,
  NodeType,
} from '../types/nodes';
import {
  LeadsToRelationshipSchema,
  AppearsInRelationshipSchema,
  TriggersRelationshipSchema,
  RequiresRelationshipSchema,
  LocatedAtRelationshipSchema,
  RelationshipType,
} from '../types/relationships';

// =============================================================================
// NODE VALIDATION FUNCTIONS
// =============================================================================

export function validateNode(nodeType: NodeType, data: any): { success: boolean; error?: string; data?: any } {
  try {
    let schema: z.ZodSchema;

    switch (nodeType) {
      case 'Scene':
        schema = SceneNodeSchema;
        break;
      case 'Character':
        schema = CharacterNodeSchema;
        break;
      case 'Choice':
        schema = ChoiceNodeSchema;
        break;
      case 'Event':
        schema = EventNodeSchema;
        break;
      case 'Location':
        schema = LocationNodeSchema;
        break;
      case 'Item':
        schema = ItemNodeSchema;
        break;
      default:
        return { success: false, error: `Unknown node type: ${nodeType}` };
    }

    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

// =============================================================================
// RELATIONSHIP VALIDATION FUNCTIONS
// =============================================================================

export function validateRelationship(relationshipType: RelationshipType, data: any): { success: boolean; error?: string; data?: any } {
  try {
    let schema: z.ZodSchema;

    switch (relationshipType) {
      case 'LEADS_TO':
        schema = LeadsToRelationshipSchema;
        break;
      case 'APPEARS_IN':
        schema = AppearsInRelationshipSchema;
        break;
      case 'TRIGGERS':
        schema = TriggersRelationshipSchema;
        break;
      case 'REQUIRES':
        schema = RequiresRelationshipSchema;
        break;
      case 'LOCATED_AT':
        schema = LocatedAtRelationshipSchema;
        break;
      default:
        return { success: false, error: `Unknown relationship type: ${relationshipType}` };
    }

    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

// =============================================================================
// BUSINESS LOGIC VALIDATION
// =============================================================================

export function validateNodeRelationshipCompatibility(
  fromNodeType: NodeType,
  toNodeType: NodeType,
  relationshipType: RelationshipType
): { valid: boolean; error?: string } {
  // Define valid relationship combinations based on Phase 1 requirements
  const validCombinations: Record<RelationshipType, Array<{ from: NodeType[]; to: NodeType[] }>> = {
    LEADS_TO: [
      { from: ['Scene'], to: ['Scene', 'Choice'] },
      { from: ['Choice'], to: ['Scene'] },
    ],
    APPEARS_IN: [
      { from: ['Character'], to: ['Scene', 'Event'] },
    ],
    TRIGGERS: [
      { from: ['Event'], to: ['Event'] },
      { from: ['Choice'], to: ['Event'] },
      { from: ['Scene'], to: ['Event'] },
    ],
    REQUIRES: [
      { from: ['Scene'], to: ['Event'] },
      { from: ['Choice'], to: ['Event'] },
      { from: ['Event'], to: ['Event'] },
    ],
    LOCATED_AT: [
      { from: ['Scene'], to: ['Location'] },
      { from: ['Character'], to: ['Location'] },
      { from: ['Item'], to: ['Location'] },
    ],
  };

  const combinations = validCombinations[relationshipType];
  if (!combinations) {
    return { valid: false, error: `Unknown relationship type: ${relationshipType}` };
  }

  const isValid = combinations.some(combo =>
    combo.from.includes(fromNodeType) && combo.to.includes(toNodeType)
  );

  if (!isValid) {
    return {
      valid: false,
      error: `Invalid relationship: ${fromNodeType} cannot have ${relationshipType} relationship to ${toNodeType}`,
    };
  }

  return { valid: true };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function sanitizeString(input: string, maxLength?: number): string {
  let sanitized = input.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

export function validateArrayUniqueness<T>(array: T[]): boolean {
  return array.length === new Set(array).size;
}

export function validatePositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function validateRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}