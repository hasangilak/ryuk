// Database Validation Queries for Ryuk Project
// Run these queries periodically to ensure data integrity

// =============================================================================
// RELATIONSHIP TYPE VALIDATION
// =============================================================================

// 1. Validate LEADS_TO relationships (should only connect Scene->Scene, Scene->Choice, Choice->Scene)
MATCH (a)-[r:LEADS_TO]->(b)
WHERE NOT (
  (a:Scene AND (b:Scene OR b:Choice)) OR
  (a:Choice AND b:Scene)
)
RETURN
  COUNT(r) as invalid_leads_to_count,
  collect({from: labels(a), to: labels(b), relationship_id: id(r)}) as invalid_relationships;

// 2. Validate APPEARS_IN relationships (Character should only appear in Scene or Event)
MATCH (c:Character)-[r:APPEARS_IN]->(target)
WHERE NOT (target:Scene OR target:Event)
RETURN
  COUNT(r) as invalid_appears_in_count,
  collect({character: c.name, target_labels: labels(target), relationship_id: id(r)}) as invalid_relationships;

// 3. Validate TRIGGERS relationships (Event should only trigger Event)
MATCH (e1:Event)-[r:TRIGGERS]->(target)
WHERE NOT target:Event
RETURN
  COUNT(r) as invalid_triggers_count,
  collect({event: e1.name, target_labels: labels(target), relationship_id: id(r)}) as invalid_relationships;

// 4. Validate LOCATED_AT relationships (Scene/Character/Item should only be located at Location)
MATCH (source)-[r:LOCATED_AT]->(target)
WHERE NOT target:Location OR NOT (source:Scene OR source:Character OR source:Item)
RETURN
  COUNT(r) as invalid_located_at_count,
  collect({source_labels: labels(source), target_labels: labels(target), relationship_id: id(r)}) as invalid_relationships;

// 5. Validate REQUIRES relationships (Choice/Event should only require Item/Event/Character)
MATCH (source)-[r:REQUIRES]->(target)
WHERE NOT (
  (source:Choice OR source:Event) AND
  (target:Item OR target:Event OR target:Character)
)
RETURN
  COUNT(r) as invalid_requires_count,
  collect({source_labels: labels(source), target_labels: labels(target), relationship_id: id(r)}) as invalid_relationships;

// =============================================================================
// PHASE 2 RELATIONSHIP VALIDATION
// =============================================================================

// 6. Validate CONTAINS relationships (hierarchical structure)
MATCH (container)-[r:CONTAINS]->(content)
WHERE NOT (
  (container:Story AND (content:Knot OR content:Scene)) OR
  (container:Knot AND (content:Stitch OR content:Scene)) OR
  (container:Stitch AND content:Scene)
)
RETURN
  COUNT(r) as invalid_contains_count,
  collect({container_labels: labels(container), content_labels: labels(content), relationship_id: id(r)}) as invalid_relationships;

// 7. Validate BELONGS_TO relationships (reverse hierarchical structure)
MATCH (content)-[r:BELONGS_TO]->(container)
WHERE NOT (
  (content:Scene AND (container:Story OR container:Knot OR container:Stitch)) OR
  (content:Knot AND container:Story) OR
  (content:Stitch AND container:Knot)
)
RETURN
  COUNT(r) as invalid_belongs_to_count,
  collect({content_labels: labels(content), container_labels: labels(container), relationship_id: id(r)}) as invalid_relationships;

// 8. Validate CONVERGES_TO relationships (choice convergence)
MATCH (choice:Choice)-[r:CONVERGES_TO]->(target)
WHERE NOT target:Scene
RETURN
  COUNT(r) as invalid_convergence_count,
  collect({choice_id: choice.id, target_labels: labels(target), relationship_id: id(r)}) as invalid_relationships;

// 9. Validate GROUPED_WITH relationships (choice grouping)
MATCH (choice1:Choice)-[r:GROUPED_WITH]->(choice2)
WHERE NOT choice2:Choice
RETURN
  COUNT(r) as invalid_grouped_with_count,
  collect({choice1_id: choice1.id, target_labels: labels(choice2), relationship_id: id(r)}) as invalid_relationships;

// 10. Validate INFLUENCES relationships (character influences)
MATCH (character1:Character)-[r:INFLUENCES]->(target)
WHERE NOT (target:Character OR target:Event OR target:Choice)
RETURN
  COUNT(r) as invalid_influences_count,
  collect({character: character1.name, target_labels: labels(target), relationship_id: id(r)}) as invalid_relationships;

// 11. Validate APPEARS_THROUGHOUT relationships (character consistency)
MATCH (character:Character)-[r:APPEARS_THROUGHOUT]->(container)
WHERE NOT (container:Story OR container:Knot OR container:Stitch)
RETURN
  COUNT(r) as invalid_appears_throughout_count,
  collect({character: character.name, container_labels: labels(container), relationship_id: id(r)}) as invalid_relationships;

// =============================================================================
// DATA CONSISTENCY VALIDATION
// =============================================================================

// 12. Check for scenes with duplicate sequences within same chapter
MATCH (s1:Scene), (s2:Scene)
WHERE s1.chapter = s2.chapter
  AND s1.sequence = s2.sequence
  AND s1.id <> s2.id
RETURN
  COUNT(*) as duplicate_sequence_count,
  collect({chapter: s1.chapter, sequence: s1.sequence, scene1: s1.id, scene2: s2.id}) as duplicates;

// 13. Check for gaps in scene sequences within chapters
MATCH (s:Scene)
WITH s.chapter as chapter, collect(s.sequence) as sequences, count(s) as scene_count
WHERE size(sequences) <> max(sequences)
RETURN
  chapter,
  sequences,
  scene_count,
  max(sequences) as max_sequence,
  'Missing sequences detected' as issue;

// 14. Check for orphaned relationships (relationships pointing to non-existent nodes)
MATCH ()-[r]->(target)
WHERE NOT EXISTS {MATCH (target)}
RETURN
  COUNT(r) as orphaned_relationships_count,
  type(r) as relationship_type;

// 15. Check for negative values in constrained fields
MATCH (s:Scene)
WHERE s.sequence <= 0 OR s.chapter <= 0
RETURN
  COUNT(s) as invalid_scene_values_count,
  collect({id: s.id, chapter: s.chapter, sequence: s.sequence}) as invalid_scenes;

MATCH (e:Event)
WHERE e.causality_level < 0
RETURN
  COUNT(e) as invalid_event_causality_count,
  collect({id: e.id, causality_level: e.causality_level}) as invalid_events;

// 16. Check for choice weights outside valid range (0-1)
MATCH (ch:Choice)
WHERE ch.weight < 0 OR ch.weight > 1
RETURN
  COUNT(ch) as invalid_choice_weights_count,
  collect({id: ch.id, weight: ch.weight}) as invalid_choices;

// =============================================================================
// PERFORMANCE AND STATISTICS
// =============================================================================

// 17. Node counts by type
MATCH (n)
RETURN labels(n) as node_type, count(n) as count
ORDER BY count DESC;

// 18. Relationship counts by type
MATCH ()-[r]->()
RETURN type(r) as relationship_type, count(r) as count
ORDER BY count DESC;

// 19. Average relationships per node
MATCH (n)
OPTIONAL MATCH (n)-[r]-()
RETURN
  labels(n) as node_type,
  count(DISTINCT n) as node_count,
  count(r) as total_relationships,
  round(count(r) * 1.0 / count(DISTINCT n), 2) as avg_relationships_per_node
ORDER BY avg_relationships_per_node DESC;

// 20. Check for isolated nodes (nodes with no relationships)
MATCH (n)
WHERE NOT EXISTS {MATCH (n)-[]-()}
RETURN
  labels(n) as node_type,
  count(n) as isolated_node_count,
  collect(n.id)[0..5] as sample_isolated_nodes;

// =============================================================================
// SUMMARY VALIDATION REPORT
// =============================================================================

// Final summary query to get overall database health
CALL {
  // Count all validation issues
  MATCH (a)-[r:LEADS_TO]->(b)
  WHERE NOT ((a:Scene AND (b:Scene OR b:Choice)) OR (a:Choice AND b:Scene))
  RETURN COUNT(r) as invalid_leads_to
}
CALL {
  MATCH (c:Character)-[r:APPEARS_IN]->(target)
  WHERE NOT (target:Scene OR target:Event)
  RETURN COUNT(r) as invalid_appears_in
}
CALL {
  MATCH (s1:Scene), (s2:Scene)
  WHERE s1.chapter = s2.chapter AND s1.sequence = s2.sequence AND s1.id <> s2.id
  RETURN COUNT(*) as duplicate_sequences
}
CALL {
  MATCH (ch:Choice)
  WHERE ch.weight < 0 OR ch.weight > 1
  RETURN COUNT(ch) as invalid_weights
}
RETURN
  invalid_leads_to,
  invalid_appears_in,
  duplicate_sequences,
  invalid_weights,
  CASE
    WHEN invalid_leads_to + invalid_appears_in + duplicate_sequences + invalid_weights = 0
    THEN 'HEALTHY'
    ELSE 'ISSUES_DETECTED'
  END as overall_status;