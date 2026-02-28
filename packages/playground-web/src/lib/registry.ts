import { createRegistry, type NodeDefinition, type NodeMetadata, type NodeCategory } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';

// Create and populate the registry
const registry = createRegistry();
for (const node of builtInNodes) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry.register(node as any);
}

/**
 * Get all node definitions
 */
export function getAllNodes(): NodeDefinition[] {
  return registry.getAllDefinitions();
}

/**
 * Get all node metadata (safe for client)
 */
export function getAllNodeMetadata(): NodeMetadata[] {
  return registry.getAllMetadata();
}

/**
 * Get node definition by type
 */
export function getNode(type: string): NodeDefinition | undefined {
  return registry.getDefinition(type);
}

/**
 * Get node metadata by type
 */
export function getNodeMetadata(type: string): NodeMetadata | undefined {
  return registry.getMetadata(type);
}

/**
 * Get nodes by category
 */
export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return registry.getByCategory(category);
}

/**
 * Get node metadata by category
 */
export function getMetadataByCategory(category: NodeCategory): NodeMetadata[] {
  return registry.getMetadataByCategory(category);
}

/**
 * Get the registry instance
 */
export function getRegistry() {
  return registry;
}

/**
 * Service requirements for each node type
 */
export const NODE_SERVICE_REQUIREMENTS: Record<string, string[]> = {
  search_contacts: ['apollo'],
  reddit_monitor: ['forumScout'],
  twitter_monitor: ['twitter'],
  linkedin_monitor: ['forumScout'],
  sora_video: ['openai'],
  seo_keyword_research: ['dataForSeo'],
  seo_audit: ['dataForSeo'],
  social_keyword_generator: ['anthropic'],
  draft_emails: ['anthropic'],
  social_ai_analyze: ['anthropic'],
  discord_send_message: ['discordBot'],
  discord_send_webhook: ['discordWebhook'],
  discord_create_thread: ['discordBot'],
};

/**
 * Get required services for a node type
 */
export function getRequiredServices(nodeType: string): string[] {
  return NODE_SERVICE_REQUIREMENTS[nodeType] || [];
}
