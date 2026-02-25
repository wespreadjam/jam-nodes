import { JSONPath } from 'jsonpath-plus';
import type { NodeExecutionContext } from '../types/index.js';
import type { NodeServices } from '../types/index.js';

/**
 * Manages workflow variables and provides utilities for:
 * - Storing node outputs as variables
 * - Retrieving variable values
 * - Interpolating variables into strings
 * - JSONPath evaluation for nested data access
 */
export class ExecutionContext {
  private variables: Record<string, unknown>;

  constructor(initialVariables: Record<string, unknown> = {}) {
    this.variables = { ...initialVariables };
  }

  /**
   * Set a variable value
   */
  setVariable(name: string, value: unknown): void {
    this.variables[name] = value;
  }

  /**
   * Get a variable value
   */
  getVariable(name: string): unknown {
    return this.variables[name];
  }

  /**
   * Get all variables as a plain object
   */
  getAllVariables(): Record<string, unknown> {
    return { ...this.variables };
  }

  /**
   * Check if a variable exists
   */
  hasVariable(name: string): boolean {
    return name in this.variables;
  }

  /**
   * Delete a variable
   */
  deleteVariable(name: string): void {
    delete this.variables[name];
  }

  /**
   * Clear all variables
   */
  clearAll(): void {
    this.variables = {};
  }

  /**
   * Merge multiple variables at once
   */
  mergeVariables(vars: Record<string, unknown>): void {
    this.variables = {
      ...this.variables,
      ...vars,
    };
  }

  /**
   * Evaluate a JSONPath expression against workflow variables
   *
   * @example
   * // Get first contact's email
   * ctx.evaluateJsonPath('$.contacts[0].email')
   *
   * @example
   * // Get all email subjects
   * ctx.evaluateJsonPath('$.emailDrafts[*].subject')
   */
  evaluateJsonPath(path: string): unknown {
    try {
      const result = JSONPath({ path, json: this.variables });

      // If path returns single value, unwrap array
      if (Array.isArray(result) && result.length === 1) {
        return result[0];
      }

      return result;
    } catch {
      return undefined;
    }
  }

  /**
   * Interpolate variables into a string template
   *
   * Supports:
   * - Simple variables: "Hello {{name}}"
   * - Nested access: "Email: {{contact.email}}"
   * - JSONPath: "First email: {{$.contacts[0].email}}"
   * - Direct value replacement: "{{contacts}}" returns the actual array
   *
   * @returns The interpolated value. If the entire string is a single variable
   * reference, returns the actual value. Otherwise returns an interpolated string.
   */
  interpolate(template: string): unknown {
    if (typeof template !== 'string') {
      return template;
    }

    // Check if the entire string is just a single variable reference
    const singleVarMatch = template.match(/^\{\{([^}]+)\}\}$/);
    if (singleVarMatch) {
      const expression = singleVarMatch[1]!.trim();

      // Return the actual value for single variable references
      if (expression.startsWith('$')) {
        return this.evaluateJsonPath(expression);
      }

      return this.resolveNestedPath(expression);
    }

    // Match {{variable}} or {{$.jsonpath.expression}}
    const regex = /\{\{([^}]+)\}\}/g;

    return template.replace(regex, (match, expression: string) => {
      const trimmed = expression.trim();

      // Check if it's a JSONPath expression
      if (trimmed.startsWith('$')) {
        const result = this.evaluateJsonPath(trimmed);
        return this.formatValue(result);
      }

      // Handle dot notation (e.g., contact.email)
      const value = this.resolveNestedPath(trimmed);
      return this.formatValue(value);
    });
  }

  /**
   * Interpolate variables in an object recursively
   *
   * Processes all string values in the object and interpolates variables.
   * Useful for interpolating variables in node settings.
   */
  interpolateObject<T>(obj: T): T {
    // Check for string FIRST
    if (typeof obj === 'string') {
      return this.interpolate(obj) as T;
    }

    // Then check for non-objects
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.interpolateObject(item)) as T;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.interpolateObject(value);
    }

    return result as T;
  }

  /**
   * Resolve nested path like "contact.email", "data[0].name", or "[0].email"
   *
   * Supported syntax:
   * - Dot notation: "contact.email"
   * - Keyed array access: "contacts[0].name"
   * - Standalone array index: "[0].name" (when current value is an array)
   * - Empty path returns the root variables object
   */
  resolveNestedPath(path: string): unknown {
    // Empty path returns all variables
    if (!path) {
      return this.variables;
    }

    const parts = path.split('.');
    let current: unknown = this.variables;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle keyed array access like "contacts[0]"
      const keyedArrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (keyedArrayMatch) {
        const [, key, index] = keyedArrayMatch;
        current = (current as Record<string, unknown>)[key!];
        if (Array.isArray(current)) {
          current = current[parseInt(index!, 10)];
        } else {
          return undefined;
        }
        continue;
      }

      // Handle standalone array index like "[0]"
      const standaloneIndexMatch = part.match(/^\[(\d+)\]$/);
      if (standaloneIndexMatch) {
        if (Array.isArray(current)) {
          current = current[parseInt(standaloneIndexMatch[1]!, 10)];
        } else {
          return undefined;
        }
        continue;
      }

      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Format a value for string interpolation
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.formatValue(v)).join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Store a node's output as variables
   *
   * The output is stored under the node's ID and also merged into root variables
   * if it's a plain object.
   *
   * @example
   * // Node "search_contacts" returns { contacts: [...] }
   * // Variables become: { search_contacts: { contacts: [...] }, contacts: [...] }
   */
  storeNodeOutput(nodeId: string, output: unknown): void {
    // Store under node ID
    this.setVariable(nodeId, output);

    // If output is a plain object, merge keys into root
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      for (const [key, value] of Object.entries(output)) {
        this.setVariable(key, value);
      }
    }
  }

  /**
   * Get a node's output by node ID
   */
  getNodeOutput<T = unknown>(nodeId: string): T | undefined {
    return this.getVariable(nodeId) as T | undefined;
  }

  /**
   * Create a NodeExecutionContext for use with executors.
   *
   * Supports two call signatures for backward compatibility:
   * - `toNodeContext(userId, workflowId, campaignId?)` — legacy
   * - `toNodeContext(userId, workflowId, { campaignId?, services? })` — preferred
   *
   * @param userId - User ID executing the workflow
   * @param workflowExecutionId - Unique workflow execution identifier
   * @param optionsOrCampaignId - Either an options object or a campaignId string (legacy)
   */
  toNodeContext(
    userId: string,
    workflowExecutionId: string,
    optionsOrCampaignId?: string | {
      campaignId?: string;
      services?: NodeServices;
    }
  ): NodeExecutionContext {
    const resolved = typeof optionsOrCampaignId === 'string'
      ? { campaignId: optionsOrCampaignId }
      : optionsOrCampaignId;

    return {
      userId,
      workflowExecutionId,
      campaignId: resolved?.campaignId,
      variables: this.getAllVariables(),
      resolveNestedPath: this.resolveNestedPath.bind(this),
      services: resolved?.services,
    };
  }

  /**
   * Export variables as JSON
   */
  toJSON(): Record<string, unknown> {
    return this.getAllVariables();
  }

  /**
   * Create ExecutionContext from JSON
   */
  static fromJSON(json: Record<string, unknown>): ExecutionContext {
    return new ExecutionContext(json);
  }
}

/**
 * Create execution context from workflow input
 */
export function createExecutionContext(
  input?: Record<string, unknown>
): ExecutionContext {
  return new ExecutionContext(input || {});
}

/**
 * Prepare node input by interpolating variables from execution context
 */
export function prepareNodeInput<T extends Record<string, unknown>>(
  nodeSettings: T,
  context: ExecutionContext
): T {
  return context.interpolateObject(nodeSettings);
}
