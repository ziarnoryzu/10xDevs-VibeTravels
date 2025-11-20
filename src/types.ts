// src/types.ts

import type { Json } from "./db/database.types";

// DTOs and Command Models derived from database entities and aligned with the API plan

/**
 * NoteDTO represents a travel note.
 * Derived from the 'notes' table.
 */
export interface NoteDTO {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  has_travel_plan: boolean;
}

/**
 * CreateNoteDTO is used to create a new travel note.
 * The 'user_id' should be provided by the authentication context.
 */
export interface CreateNoteDTO {
  title: string;
  content?: string | null;
  user_id: string;
}

/**
 * UpdateNoteDTO is used to update an existing note.
 * Partial update of 'title' and 'content'.
 */
export type UpdateNoteDTO = Partial<Pick<NoteDTO, "title" | "content">>;

/**
 * NoteListItemDTO represents a note in the notes list view.
 * This is a lighter version of NoteDTO for list displays.
 */
export interface NoteListItemDTO {
  id: string;
  title: string;
  updated_at: string;
  has_travel_plan: boolean;
}

/**
 * PaginationViewModel represents pagination metadata for list views.
 * Used by components to display and control pagination.
 */
export interface PaginationViewModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * NoteListItemViewModel is the view model for the NoteListItem component.
 * Contains formatted data ready for display, including computed properties.
 */
export interface NoteListItemViewModel {
  id: string;
  title: string;
  lastModified: string; // Formatted date, e.g. "2 dni temu"
  hasTravelPlan: boolean;
  href: string; // Path to note details, e.g. /app/notes/some-uuid
}

/**
 * NotesListApiResponse represents the API response for GET /api/notes
 * Contains notes list and pagination metadata
 */
export interface NotesListApiResponse {
  notes: NoteListItemDTO[];
  pagination: PaginationViewModel;
}

/**
 * TravelPlanDTO represents an AI-generated travel plan.
 * Derived from the 'travel_plans' table.
 */
export interface TravelPlanDTO {
  id: string;
  note_id: string;
  content: Json;
  created_at: string;
  updated_at: string;
}

// New common options type for travel plan commands
export interface TravelPlanOptions {
  style?: "adventure" | "leisure";
  transport?: "car" | "public" | "walking";
  budget?: "economy" | "standard" | "luxury";
}

/**
 * GenerateTravelPlanCommand is the payload for generating a new travel plan.
 * It supports optional personalization options.
 */
export interface GenerateTravelPlanCommand {
  options?: TravelPlanOptions;
}

/**
 * UpdateTravelPlanCommand is used to update an existing travel plan.
 * It requires a confirmation flag to overwrite the previous plan.
 */
export interface UpdateTravelPlanCommand {
  confirm: boolean;
  options?: TravelPlanOptions;
}

/**
 * UserProfileDTO represents the full user profile data.
 * Used for displaying and managing user profile information.
 */
export interface UserProfileDTO {
  id: string;
  email: string;
  name: string;
  preferences: string[];
  created_at: string;
}

/**
 * UpdateUserProfileDTO is used to update user profile information.
 * Supports partial updates of name and preferences.
 */
export interface UpdateUserProfileDTO {
  name?: string;
  preferences?: string[];
}

/**
 * ChangePasswordDTO is used for password change operations.
 * Requires current password for verification and new password.
 */
export interface ChangePasswordDTO {
  current_password: string;
  new_password: string;
}

/**
 * GenerationOptions represents personalization options for travel plan generation.
 * Used in GeneratePlanModal for user preferences.
 */
export interface GenerationOptions {
  style: "adventure" | "leisure";
  transport: "car" | "public" | "walking";
  budget: "economy" | "standard" | "luxury";
}

/**
 * UpdatePlanRequest is the payload for updating/regenerating an existing travel plan.
 * Requires confirmation flag to prevent accidental overwrites.
 */
export interface UpdatePlanRequest {
  confirm: boolean;
  options?: Partial<GenerationOptions>;
}

/**
 * PlanActivity represents a single activity in a travel plan.
 * Contains details about the activity including logistics information.
 */
export interface PlanActivity {
  name: string;
  description: string;
  priceCategory: string;
  logistics: {
    address?: string;
    mapLink?: string;
    estimatedTime?: string;
  };
}

/**
 * TravelDay represents a single day in the travel itinerary.
 * Activities are organized by time of day (morning, afternoon, evening).
 * Time periods are optional to support partial days (e.g., arrival in evening, departure in morning).
 */
export interface TravelDay {
  day: number;
  date?: string; // Optional: date in ISO format (YYYY-MM-DD) if specified in note
  dayOfWeek?: string; // Optional: day of week in Polish (e.g., "Piątek", "Sobota")
  title: string;
  activities: {
    morning?: PlanActivity[];
    afternoon?: PlanActivity[];
    evening?: PlanActivity[];
  };
}

/**
 * TravelPlanContent is the structured content of a travel plan.
 * Contains the complete itinerary and disclaimer.
 */
export interface TravelPlanContent {
  days: TravelDay[];
  disclaimer: string;
}

/**
 * TypedTravelPlan extends TravelPlanDTO with strongly typed content.
 * Used for type-safe rendering of travel plan details.
 */
export interface TypedTravelPlan extends Omit<TravelPlanDTO, "content"> {
  content: TravelPlanContent;
}

/**
 * NoteWithPlan combines a note with its optional travel plan.
 * Used in components that need both note and plan information.
 */
export interface NoteWithPlan extends NoteDTO {
  travel_plan: TravelPlanDTO | null;
}

/**
 * AutosaveStatusViewModel represents the state of autosave operations.
 * Used to track and display save status in the NoteEditor component.
 */
export type AutosaveStatusViewModel = "idle" | "saving" | "success" | "error";

/**
 * NoteEditorViewModel is the view model for the NoteEditor component.
 * Contains all data needed to render the note editing form with autosave status.
 */
export interface NoteEditorViewModel {
  title: string;
  content: string | null;
  status: AutosaveStatusViewModel;
  lastSavedTimestamp: string;
}

/**
 * NoteWithPlanViewModel represents the complete state for the note detail view.
 * Combines note data with computed properties for UI rendering.
 */
export interface NoteWithPlanViewModel {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
  travelPlan: TypedTravelPlan | null;
  wordCount: number;
  isReadyForPlanGeneration: boolean;
}

/**
 * NavComponentProps defines props for navigation components.
 * Used by Sidebar and MobileNav to determine the active page.
 */
export interface NavComponentProps {
  activePath: string;
}

/**
 * NavLinkProps defines props for a single navigation link.
 * Used by NavLink component to render and style navigation items.
 */
export interface NavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
}

/**
 * NavItem represents a single navigation item in the app.
 * Defines the structure for navigation links in Sidebar and MobileNav.
 */
export interface NavItem {
  href: string;
  label: string;
}

/**
 * ChatCompletionParams defines the parameters for a chat completion request.
 * Used by OpenRouterService to generate text responses from LLMs.
 *
 * Model is optional - business logic (e.g., TravelPlanService) can provide it
 * (typically from OPENROUTER_MODEL env var), otherwise defaults to claude-3.5-haiku.
 */
export interface ChatCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  model?: string; // Optional - falls back to claude-3.5-haiku if not provided
  temperature?: number;
  max_tokens?: number;
}

/**
 * StructuredDataParams defines parameters for structured data generation.
 * Extends ChatCompletionParams with schema information for type-safe JSON outputs.
 */
export interface StructuredDataParams<T extends import("zod").ZodTypeAny> extends ChatCompletionParams {
  schemaName: string;
  schemaDescription: string;
  schema: T;
}
