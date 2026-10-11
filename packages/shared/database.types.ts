export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string
          id: string
          is_own_brand: boolean
          logo_key: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_own_brand?: boolean
          logo_key?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_own_brand?: boolean
          logo_key?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          size_label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          size_label?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          size_label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_levels: {
        Row: {
          created_at: string
          quantity: number
          store_id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          quantity?: number
          store_id: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          quantity?: number
          store_id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string
          created_at: string
          height: number
          id: string
          key_base: string
          product_id: string
          sort_order: number
          updated_at: string
          variant_id: string | null
          width: number
        }
        Insert: {
          alt?: string
          created_at?: string
          height: number
          id?: string
          key_base: string
          product_id: string
          sort_order?: number
          updated_at?: string
          variant_id?: string | null
          width: number
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number
          id?: string
          key_base?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
          variant_id?: string | null
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sports: {
        Row: {
          created_at: string
          product_id: string
          sport_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          sport_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          option1_value: string | null
          option2_value: string | null
          product_id: string
          sku: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          option1_value?: string | null
          option2_value?: string | null
          product_id: string
          sku: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          option1_value?: string | null
          option2_value?: string | null
          product_id?: string
          sku?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          audience: Database["public"]["Enums"]["audience"]
          brand_id: string
          category_id: string
          color_note: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_customizable: boolean
          is_featured: boolean
          legacy_url: string | null
          min_suggested_qty: number | null
          name: string
          option1_name: string
          option2_name: string | null
          published_at: string | null
          search_text: string
          short_description: string
          sku: string
          slug: string
          sort_order: number
          specs: Json
          status: Database["public"]["Enums"]["product_status"]
          subcategory_id: string | null
          tags: string[]
          techniques: string[]
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["audience"]
          brand_id: string
          category_id: string
          color_note?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_customizable?: boolean
          is_featured?: boolean
          legacy_url?: string | null
          min_suggested_qty?: number | null
          name: string
          option1_name?: string
          option2_name?: string | null
          published_at?: string | null
          search_text?: string
          short_description?: string
          sku: string
          slug: string
          sort_order?: number
          specs?: Json
          status?: Database["public"]["Enums"]["product_status"]
          subcategory_id?: string | null
          tags?: string[]
          techniques?: string[]
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["audience"]
          brand_id?: string
          category_id?: string
          color_note?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_customizable?: boolean
          is_featured?: boolean
          legacy_url?: string | null
          min_suggested_qty?: number | null
          name?: string
          option1_name?: string
          option2_name?: string | null
          published_at?: string | null
          search_text?: string
          short_description?: string
          sku?: string
          slug?: string
          sort_order?: number
          specs?: Json
          status?: Database["public"]["Enums"]["product_status"]
          subcategory_id?: string | null
          tags?: string[]
          techniques?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          created_at: string
          full_name: string
          is_active: boolean
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          borough: string
          city: string
          created_at: string
          directions: string
          email: string | null
          hours: Json
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          neighborhood: string
          phone: string | null
          postal_code: string
          slug: string
          sort_order: number
          street: string
          updated_at: string
        }
        Insert: {
          borough: string
          city?: string
          created_at?: string
          directions?: string
          email?: string | null
          hours?: Json
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          neighborhood: string
          phone?: string | null
          postal_code: string
          slug: string
          sort_order?: number
          street: string
          updated_at?: string
        }
        Update: {
          borough?: string
          city?: string
          created_at?: string
          directions?: string
          email?: string | null
          hours?: Json
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          neighborhood?: string
          phone?: string | null
          postal_code?: string
          slug?: string
          sort_order?: number
          street?: string
          updated_at?: string
        }
        Relationships: []
      }
      variant_prices: {
        Row: {
          created_at: string
          currency: string
          min_qty: number
          unit_price_cents: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          min_qty?: number
          unit_price_cents: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          min_qty?: number
          unit_price_cents?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      normalize_search_text: { Args: { value: string }; Returns: string }
      product_search_text: {
        Args: {
          product_brand_id: string
          product_name: string
          product_sku: string
          product_tags: string[]
        }
        Returns: string
      }
    }
    Enums: {
      audience: "adulto" | "infantil" | "unisex"
      content_status: "draft" | "published"
      customer_type:
        | "league_team"
        | "school_academy"
        | "company_institution"
        | "individual"
      delivery_method: "pickup" | "shipping"
      product_status: "draft" | "published" | "archived"
      publish_status: "queued" | "running" | "success" | "failed"
      quote_status: "new" | "in_progress" | "quoted" | "won" | "lost"
      staff_role: "admin" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audience: ["adulto", "infantil", "unisex"],
      content_status: ["draft", "published"],
      customer_type: [
        "league_team",
        "school_academy",
        "company_institution",
        "individual",
      ],
      delivery_method: ["pickup", "shipping"],
      product_status: ["draft", "published", "archived"],
      publish_status: ["queued", "running", "success", "failed"],
      quote_status: ["new", "in_progress", "quoted", "won", "lost"],
      staff_role: ["admin", "editor"],
    },
  },
} as const
