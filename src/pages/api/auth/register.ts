// src/pages/api/auth/register.ts

import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

// Zod schema for registration request
const RegisterSchema = z.object({
  name: z.string().min(2, "Imię musi mieć co najmniej 2 znaki"),
  email: z.string().email("Nieprawidłowy format adresu email"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/\d/, "Hasło musi zawierać co najmniej jedną cyfrę"),
});

/**
 * POST /api/auth/register
 *
 * Registers a new user with email, password, and name.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Step 1: Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Nieprawidłowe dane żądania",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Validate request body with Zod
    const validationResult = RegisterSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: validationResult.error.errors[0].message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { name, email, password } = validationResult.data;

    // Step 3: Create Supabase client and attempt sign up
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    // Step 4: Handle registration error
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Registration error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: error,
      });

      // Check if email already exists
      if (error.message && error.message.includes("already registered")) {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "Konto z tym adresem email już istnieje",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: `Błąd rejestracji: ${error.message || JSON.stringify(error)}`,
          details: error,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Create onboarding sample note and travel plan for new users
    if (data.user) {
      try {
        // Create sample note
        const { data: sampleNote, error: noteError } = await supabase
          .from("notes")
          .insert({
            user_id: data.user.id,
            title: "Przykładowa podróż do Krakowa",
            content: `Planuję weekend w Krakowie. Chcę zobaczyć Stare Miasto, Wawel i może Sukiennice. Lubię historię i architekturę. Szukam spokojnego miejsca na obiad z regionalną kuchnią. Budżet średni, preferuję komunikację miejską.`,
          })
          .select()
          .single();

        if (noteError) {
          // eslint-disable-next-line no-console
          console.error("Error creating sample note:", noteError);
        } else if (sampleNote) {
          // Create sample travel plan
          const samplePlanContent = {
            days: [
              {
                day: 1,
                date: "2025-11-15",
                dayOfWeek: "Piątek",
                title: "Pierwszy dzień w Krakowie",
                activities: {
                  morning: [
                    {
                      name: "Zwiedzanie Wawelu",
                      description: "Odwiedź królewski zamek i katedrę - symbol polskiego dziedzictwa historycznego",
                      priceCategory: "Średnia",
                      logistics: {
                        address: "Wawel 5, Kraków",
                        estimatedTime: "2-3 godziny",
                      },
                    },
                  ],
                  afternoon: [
                    {
                      name: "Stare Miasto",
                      description: "Spacer po Rynku Głównym, zobacz Sukiennice i Kościół Mariacki",
                      priceCategory: "Niska",
                      logistics: {
                        address: "Rynek Główny, Kraków",
                        estimatedTime: "3-4 godziny",
                      },
                    },
                  ],
                  evening: [
                    {
                      name: "Obiad w restauracji",
                      description: "Spróbuj regionalnych potraw w przytulnej restauracji na Starym Mieście",
                      priceCategory: "Średnia",
                      logistics: {
                        address: "Okolice Rynku Głównego",
                        estimatedTime: "1-2 godziny",
                      },
                    },
                  ],
                },
              },
              {
                day: 2,
                date: "2025-11-16",
                dayOfWeek: "Sobota",
                title: "Drugi dzień w Krakowie",
                activities: {
                  morning: [
                    {
                      name: "Śniadanie w hotelu",
                      description: "Rozpocznij dzień od zdrowego śniadania",
                      priceCategory: "Średnia",
                      logistics: {
                        address: "Twój hotel",
                        estimatedTime: "30 minut",
                      },
                    },
                  ],
                  afternoon: [
                    {
                      name: "Muzeum Czartoryskich",
                      description: "Zobacz słynną Damę z gronostajem Leonarda da Vinci",
                      priceCategory: "Średnia",
                      logistics: {
                        address: "ul. Św. Jana 19, Kraków",
                        estimatedTime: "1-2 godziny",
                      },
                    },
                  ],
                  evening: [
                    {
                      name: "Powrót do domu",
                      description: "Koniec weekendu w Krakowie",
                      priceCategory: "Niska",
                      logistics: {
                        address: "Stacja kolejowa lub dworzec autobusowy",
                        estimatedTime: "Zależy od środka transportu",
                      },
                    },
                  ],
                },
              },
            ],
            disclaimer:
              "Ten przykładowy plan został wygenerowany automatycznie, aby pokazać możliwości aplikacji. Zawiera przykładowe aktywności i może wymagać dostosowania do Twoich rzeczywistych potrzeb i dostępności.",
          };

          const { error: planError } = await supabase.from("travel_plans").insert({
            note_id: sampleNote.id,
            content: samplePlanContent,
          });

          if (planError) {
            // eslint-disable-next-line no-console
            console.error("Error creating sample plan:", planError);
          }
        }
      } catch (onboardingError) {
        // eslint-disable-next-line no-console
        console.error("Error during onboarding setup:", onboardingError);
        // Don't fail registration if onboarding setup fails
      }
    }

    // Step 6: Return success response
    return new Response(
      JSON.stringify({
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/auth/register:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
