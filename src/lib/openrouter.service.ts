// src/lib/openrouter.service.ts

import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import type { ChatCompletionParams, StructuredDataParams } from "../types";
import {
  AuthenticationError,
  BadRequestError,
  RateLimitError,
  ServerError,
  InvalidJSONResponseError,
  SchemaValidationError,
} from "./errors/openrouter.errors";

/**
 * OpenRouterService is a server-side service class for interacting with the OpenRouter API.
 * It provides methods for generating chat completions and structured data outputs using LLMs.
 *
 * Key Features:
 * - Secure API key management using environment variables
 * - Support for standard chat completions
 * - Support for structured JSON outputs with Zod schema validation
 * - Comprehensive error handling with custom error types
 *
 * @example
 * ```typescript
 * const service = new OpenRouterService();
 * const response = await service.getChatCompletion({
 *   systemPrompt: "You are a helpful assistant.",
 *   userPrompt: "What is the capital of France?"
 * });
 * ```
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly defaultModel = "anthropic/claude-3.5-haiku";
  private readonly apiUrl = "https://openrouter.ai/api/v1/chat/completions";

  /**
   * Constructs a new OpenRouterService instance.
   * Loads the API key from environment variables.
   *
   * This service provides a sensible default model (claude-3.5-haiku) as fallback,
   * but business logic layer (e.g., TravelPlanService) can override it by passing
   * a model parameter, typically from OPENROUTER_MODEL environment variable.
   *
   * @param runtimeEnv - Optional Cloudflare runtime environment variables
   * @throws {Error} If the OPENROUTER_API_KEY environment variable is not set.
   */
  constructor(runtimeEnv?: Record<string, string | undefined>) {
    // Load API key from environment variables
    // Try Cloudflare runtime first (for production), then fall back to build-time env
    this.apiKey = runtimeEnv?.OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;

    // Fail-fast strategy: throw an error if the API key is missing
    if (!this.apiKey) {
      throw new Error("Zmienna środowiskowa OPENROUTER_API_KEY nie jest ustawiona.");
    }
  }

  /**
   * Generates a simple text completion from the LLM based on system and user prompts.
   *
   * @param params - Parameters for the chat completion request
   * @returns A promise that resolves to the generated text response
   * @throws {AuthenticationError} If the API key is invalid or missing
   * @throws {BadRequestError} If the request payload is malformed
   * @throws {RateLimitError} If the API rate limit has been exceeded
   * @throws {ServerError} If the API is currently unavailable
   *
   * @example
   * ```typescript
   * const response = await openRouterService.getChatCompletion({
   *   systemPrompt: "You are a travel agent.",
   *   userPrompt: "Suggest a 3-day itinerary for Paris.",
   *   temperature: 0.7
   * });
   * ```
   */
  public async getChatCompletion(params: ChatCompletionParams): Promise<string> {
    // Validate required parameters
    if (!params.systemPrompt || !params.userPrompt) {
      throw new BadRequestError("systemPrompt i userPrompt są wymagane.");
    }

    // Construct request body
    const body = {
      model: params.model || this.defaultModel,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    };

    // Make API request
    const responseJson = await this.fetchFromApi(body);

    // Extract and return the response content
    return responseJson.choices[0].message.content;
  }

  /**
   * Generates structured JSON data from the LLM based on a Zod schema.
   * Uses OpenRouter's function calling feature to ensure the response matches the schema.
   *
   * @param params - Parameters for structured data generation including the Zod schema
   * @returns A promise that resolves to the validated, typed object
   * @throws {AuthenticationError} If the API key is invalid or missing
   * @throws {BadRequestError} If the request payload is malformed
   * @throws {RateLimitError} If the API rate limit has been exceeded
   * @throws {ServerError} If the API is currently unavailable
   * @throws {InvalidJSONResponseError} If the model returns invalid JSON
   * @throws {SchemaValidationError} If the JSON doesn't match the provided schema
   *
   * @example
   * ```typescript
   * const travelPlan = await openRouterService.getStructuredData({
   *   systemPrompt: "You are a travel planner.",
   *   userPrompt: "Create a 3-day plan for Paris.",
   *   schema: TravelPlanSchema,
   *   schemaName: "create_travel_plan",
   *   schemaDescription: "Creates a structured travel plan",
   *   model: "openai/gpt-4o"
   * });
   * ```
   */
  public async getStructuredData<T extends z.ZodTypeAny>(params: StructuredDataParams<T>): Promise<z.infer<T>> {
    // Validate required parameters
    if (!params.systemPrompt || !params.userPrompt) {
      throw new BadRequestError("systemPrompt i userPrompt są wymagane.");
    }

    if (!params.schema || !params.schemaName || !params.schemaDescription) {
      throw new BadRequestError("schema, schemaName i schemaDescription są wymagane.");
    }

    // Convert Zod schema to JSON Schema
    // Note: Don't pass name as second param - it wraps schema in $ref which OpenRouter doesn't accept
    const jsonSchema = zodToJsonSchema(params.schema);

    // Construct request body with function calling
    const body = {
      model: params.model || this.defaultModel,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: params.schemaName,
            description: params.schemaDescription,
            parameters: jsonSchema,
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: params.schemaName },
      },
      temperature: params.temperature,
    };

    // Retry logic for schema validation errors (AI models are probabilistic)
    // Disabled (1 attempt) to avoid timeouts for long plans
    // With improved schema (optional fields, defaults), retry is less necessary
    const maxRetries = 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Make API request
        const responseJson = await this.fetchFromApi(body);

        // Extract tool call from response
        const toolCall = responseJson.choices[0].message.tool_calls[0];

        // Validate tool call type
        if (toolCall.type !== "function") {
          throw new Error('Oczekiwano wywołania narzędzia typu "function" z API.');
        }

        // Extract raw JSON arguments
        const rawJson = toolCall.function.arguments;

        // Parse JSON
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(rawJson);
        } catch {
          throw new InvalidJSONResponseError(rawJson);
        }

        // Clean up the response - remove any incomplete/empty days from the array
        // This handles cases where models generate arrays with trailing undefined elements
        if (
          typeof parsedJson === "object" &&
          parsedJson !== null &&
          "days" in parsedJson &&
          Array.isArray((parsedJson as { days: unknown }).days)
        ) {
          const cleaned = parsedJson as { days: unknown[]; disclaimer?: string };

          // Extract disclaimer if it's mistakenly placed inside the days array
          const disclaimerIndex = cleaned.days.findIndex(
            (day) => day !== null && typeof day === "object" && "disclaimer" in day && !("day" in day)
          );

          if (disclaimerIndex !== -1) {
            const disclaimerObj = cleaned.days[disclaimerIndex] as { disclaimer: string };
            cleaned.disclaimer = disclaimerObj.disclaimer;
            cleaned.days.splice(disclaimerIndex, 1); // Remove from array
          }

          // Filter and fix days
          cleaned.days = cleaned.days.filter((day) => {
            // Filter out null, undefined, or empty objects
            if (day === null || day === undefined || typeof day !== "object") return false;
            const dayObj = day as Record<string, unknown>;
            if (Object.keys(dayObj).length === 0) return false;

            // Skip objects that only have disclaimer (already extracted)
            if ("disclaimer" in dayObj && !("day" in dayObj)) return false;

            // Fix activities structure if it's an array instead of object
            // Model sometimes returns activities: [...] instead of activities: { morning: [...], afternoon: [...], evening: [...] }
            if ("activities" in dayObj && Array.isArray(dayObj.activities)) {
              // Convert flat array to time-of-day structure
              // Since we don't know the intended time of day, put all in afternoon as reasonable default
              dayObj.activities = {
                afternoon: dayObj.activities,
              };
            }

            // Note: We do NOT add empty arrays for missing time periods (morning/afternoon/evening)
            // The schema now supports optional time periods for partial days (e.g., arrival/departure days)

            return true;
          });
          parsedJson = cleaned;
        }

        // Validate against Zod schema
        const validationResult = params.schema.safeParse(parsedJson);
        if (!validationResult.success) {
          throw new SchemaValidationError(validationResult.error);
        }

        // Success! Return validated and typed data
        return validationResult.data;
      } catch (error) {
        lastError = error as Error;

        // Only retry for schema validation errors (AI might generate better structure next time)
        if (error instanceof SchemaValidationError && attempt < maxRetries) {
          // eslint-disable-next-line no-console
          console.warn(`⚠️  Schema validation failed on attempt ${attempt}/${maxRetries}, retrying...`);
          continue;
        }

        // For all other errors or last attempt, throw immediately
        throw error;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error("Unexpected error in retry logic");
  }

  /**
   * Private method to make HTTP requests to the OpenRouter API.
   * Handles authentication, error responses, and JSON parsing.
   *
   * @param body - The request body to send to the API
   * @returns A promise that resolves to the parsed JSON response
   * @throws {AuthenticationError} If the API returns a 401 status
   * @throws {BadRequestError} If the API returns a 400 status
   * @throws {RateLimitError} If the API returns a 429 status
   * @throws {ServerError} If the API returns a 5xx status
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchFromApi(body: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // Handle error responses
      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new AuthenticationError();
          case 400: {
            const errorText = await response.text();
            throw new BadRequestError(errorText);
          }
          case 429:
            throw new RateLimitError();
          default:
            throw new ServerError();
        }
      }

      // Parse and return JSON response
      return await response.json();
    } catch (error) {
      // Re-throw OpenRouter errors as-is
      if (
        error instanceof AuthenticationError ||
        error instanceof BadRequestError ||
        error instanceof RateLimitError ||
        error instanceof ServerError
      ) {
        throw error;
      }

      // Wrap network errors and other unexpected errors
      throw new ServerError();
    }
  }
}
