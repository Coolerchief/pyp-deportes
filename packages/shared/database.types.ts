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
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          first_seen_at: string
          id: string
          last_seen_at: string
          name: string
          organization: string | null
          phone: string
          quote_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name: string
          organization?: string | null
          phone: string
          quote_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          name?: string
          organization?: string | null
          phone?: string
          quote_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      folio_counters: {
        Row: {
          created_at: string
          last_value: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          last_value?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          last_value?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      gallery_item_products: {
        Row: {
          created_at: string
          gallery_item_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          gallery_item_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          gallery_item_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_item_products_gallery_item_id_fkey"
            columns: ["gallery_item_id"]
            isOneToOne: false
            referencedRelation: "gallery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_item_products_gallery_item_id_fkey"
            columns: ["gallery_item_id"]
            isOneToOne: false
            referencedRelation: "public_gallery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_item_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_item_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          alt: string
          created_at: string
          has_guardian_consent: boolean
          has_written_consent: boolean
          height: number
          id: string
          includes_minors: boolean
          key_base: string
          sort_order: number
          sport_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          team_name: string
          updated_at: string
          width: number
          year: number | null
        }
        Insert: {
          alt?: string
          created_at?: string
          has_guardian_consent?: boolean
          has_written_consent?: boolean
          height: number
          id?: string
          includes_minors?: boolean
          key_base: string
          sort_order?: number
          sport_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          team_name: string
          updated_at?: string
          width: number
          year?: number | null
        }
        Update: {
          alt?: string
          created_at?: string
          has_guardian_consent?: boolean
          has_written_consent?: boolean
          height?: number
          id?: string
          includes_minors?: boolean
          key_base?: string
          sort_order?: number
          sport_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          team_name?: string
          updated_at?: string
          width?: number
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "public_sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
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
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_product_variants"
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
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_product_variants"
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
            foreignKeyName: "product_sports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "public_sports"
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
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
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
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_brands"
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
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "public_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          reason: string
          requested_by: string | null
          run_url: string | null
          status: Database["public"]["Enums"]["publish_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          reason?: string
          requested_by?: string | null
          run_url?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          reason?: string
          requested_by?: string | null
          run_url?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          updated_at?: string
        }
        Relationships: []
      }
      quote_request_items: {
        Row: {
          created_at: string
          id: string
          line_no: number
          notes: string
          personalize: boolean
          product_id: string | null
          product_name: string
          quantity: number
          quote_request_id: string
          sku: string
          unit_price_cents: number | null
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_no: number
          notes?: string
          personalize?: boolean
          product_id?: string | null
          product_name: string
          quantity: number
          quote_request_id: string
          sku: string
          unit_price_cents?: number | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_no?: number
          notes?: string
          personalize?: boolean
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_request_id?: string
          sku?: string
          unit_price_cents?: number | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_items_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_request_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          client_request_id: string
          created_at: string
          customer_id: string
          customer_name: string
          customer_phone: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          folio: string
          id: string
          internal_note: string
          ip_hash: string | null
          lost_reason: string | null
          needed_by: string
          note: string
          organization: string | null
          privacy_accepted_at: string
          privacy_version: string
          requires_invoice: boolean
          status: Database["public"]["Enums"]["quote_status"]
          store_id: string | null
          total_pieces: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          client_request_id: string
          created_at?: string
          customer_id: string
          customer_name: string
          customer_phone: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          folio: string
          id?: string
          internal_note?: string
          ip_hash?: string | null
          lost_reason?: string | null
          needed_by: string
          note?: string
          organization?: string | null
          privacy_accepted_at: string
          privacy_version: string
          requires_invoice?: boolean
          status?: Database["public"]["Enums"]["quote_status"]
          store_id?: string | null
          total_pieces: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          client_request_id?: string
          created_at?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          folio?: string
          id?: string
          internal_note?: string
          ip_hash?: string | null
          lost_reason?: string | null
          needed_by?: string
          note?: string
          organization?: string | null
          privacy_accepted_at?: string
          privacy_version?: string
          requires_invoice?: boolean
          status?: Database["public"]["Enums"]["quote_status"]
          store_id?: string | null
          total_pieces?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["quote_status"] | null
          id: number
          note: string
          quote_request_id: string
          to_status: Database["public"]["Enums"]["quote_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["quote_status"] | null
          id?: never
          note?: string
          quote_request_id: string
          to_status: Database["public"]["Enums"]["quote_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["quote_status"] | null
          id?: never
          note?: string
          quote_request_id?: string
          to_status?: Database["public"]["Enums"]["quote_status"]
        }
        Relationships: [
          {
            foreignKeyName: "quote_status_history_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_media: {
        Row: {
          alt: string
          created_at: string
          height: number | null
          key_base: string | null
          slot: string
          updated_at: string
          updated_by: string | null
          width: number | null
        }
        Insert: {
          alt?: string
          created_at?: string
          height?: number | null
          key_base?: string | null
          slot: string
          updated_at?: string
          updated_by?: string | null
          width?: number | null
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number | null
          key_base?: string | null
          slot?: string
          updated_at?: string
          updated_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      site_texts: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
      system_heartbeats: {
        Row: {
          created_at: string
          id: number
          source: string
        }
        Insert: {
          created_at?: string
          id?: never
          source: string
        }
        Update: {
          created_at?: string
          id?: never
          source?: string
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
          {
            foreignKeyName: "variant_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_brands: {
        Row: {
          created_at: string | null
          id: string | null
          is_own_brand: boolean | null
          logo_key: string | null
          name: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_own_brand?: boolean | null
          logo_key?: string | null
          name?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_own_brand?: boolean | null
          logo_key?: string | null
          name?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_categories: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          parent_id: string | null
          size_label: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          parent_id?: string | null
          size_label?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          parent_id?: string | null
          size_label?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      public_gallery_item_products: {
        Row: {
          gallery_item_id: string | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_item_products_gallery_item_id_fkey"
            columns: ["gallery_item_id"]
            isOneToOne: false
            referencedRelation: "gallery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_item_products_gallery_item_id_fkey"
            columns: ["gallery_item_id"]
            isOneToOne: false
            referencedRelation: "public_gallery_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_item_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_item_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_gallery_items: {
        Row: {
          alt: string | null
          created_at: string | null
          height: number | null
          id: string | null
          key_base: string | null
          sort_order: number | null
          sport_id: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          team_name: string | null
          updated_at: string | null
          width: number | null
          year: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string | null
          height?: number | null
          id?: string | null
          key_base?: string | null
          sort_order?: number | null
          sport_id?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          team_name?: string | null
          updated_at?: string | null
          width?: number | null
          year?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string | null
          height?: number | null
          id?: string | null
          key_base?: string | null
          sort_order?: number | null
          sport_id?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          team_name?: string | null
          updated_at?: string | null
          width?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "public_sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      public_inventory: {
        Row: {
          created_at: string | null
          quantity: number | null
          store_id: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "public_stores"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "inventory_levels_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_product_images: {
        Row: {
          alt: string | null
          created_at: string | null
          height: number | null
          id: string | null
          key_base: string | null
          product_id: string | null
          sort_order: number | null
          updated_at: string | null
          variant_id: string | null
          width: number | null
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
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_product_sports: {
        Row: {
          product_id: string | null
          sport_id: string | null
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
            foreignKeyName: "product_sports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "public_sports"
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
      public_product_variants: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          is_default: boolean | null
          option1_value: string | null
          option2_value: string | null
          product_id: string | null
          sku: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_products: {
        Row: {
          audience: Database["public"]["Enums"]["audience"] | null
          brand_id: string | null
          category_id: string | null
          color_note: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_customizable: boolean | null
          is_featured: boolean | null
          legacy_url: string | null
          min_suggested_qty: number | null
          name: string | null
          option1_name: string | null
          option2_name: string | null
          published_at: string | null
          short_description: string | null
          sku: string | null
          slug: string | null
          sort_order: number | null
          specs: Json | null
          status: Database["public"]["Enums"]["product_status"] | null
          subcategory_id: string | null
          tags: string[] | null
          techniques: string[] | null
          updated_at: string | null
        }
        Insert: {
          audience?: Database["public"]["Enums"]["audience"] | null
          brand_id?: string | null
          category_id?: string | null
          color_note?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_customizable?: boolean | null
          is_featured?: boolean | null
          legacy_url?: string | null
          min_suggested_qty?: number | null
          name?: string | null
          option1_name?: string | null
          option2_name?: string | null
          published_at?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["product_status"] | null
          subcategory_id?: string | null
          tags?: string[] | null
          techniques?: string[] | null
          updated_at?: string | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["audience"] | null
          brand_id?: string | null
          category_id?: string | null
          color_note?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_customizable?: boolean | null
          is_featured?: boolean | null
          legacy_url?: string | null
          min_suggested_qty?: number | null
          name?: string | null
          option1_name?: string | null
          option2_name?: string | null
          published_at?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          specs?: Json | null
          status?: Database["public"]["Enums"]["product_status"] | null
          subcategory_id?: string | null
          tags?: string[] | null
          techniques?: string[] | null
          updated_at?: string | null
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
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "public_brands"
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
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "public_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      public_settings: {
        Row: {
          created_at: string | null
          is_public: boolean | null
          key: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          is_public?: boolean | null
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          is_public?: boolean | null
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      public_site_media: {
        Row: {
          alt: string | null
          created_at: string | null
          height: number | null
          key_base: string | null
          slot: string | null
          updated_at: string | null
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string | null
          height?: number | null
          key_base?: string | null
          slot?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string | null
          height?: number | null
          key_base?: string | null
          slot?: string | null
          updated_at?: string | null
          width?: number | null
        }
        Relationships: []
      }
      public_site_texts: {
        Row: {
          created_at: string | null
          key: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      public_sports: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_stores: {
        Row: {
          borough: string | null
          city: string | null
          created_at: string | null
          directions: string | null
          email: string | null
          hours: Json | null
          id: string | null
          is_active: boolean | null
          lat: number | null
          lng: number | null
          name: string | null
          neighborhood: string | null
          phone: string | null
          postal_code: string | null
          slug: string | null
          sort_order: number | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          borough?: string | null
          city?: string | null
          created_at?: string | null
          directions?: string | null
          email?: string | null
          hours?: Json | null
          id?: string | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          sort_order?: number | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          borough?: string | null
          city?: string | null
          created_at?: string | null
          directions?: string | null
          email?: string | null
          hours?: Json | null
          id?: string | null
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          neighborhood?: string | null
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          sort_order?: number | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      public_variant_prices: {
        Row: {
          created_at: string | null
          currency: string | null
          min_qty: number | null
          unit_price_cents: number | null
          updated_at: string | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "public_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_add_product_image: {
        Args: {
          alt?: string
          height: number
          image_id: string
          product_id: string
          width: number
        }
        Returns: string
      }
      admin_anonymize_customer: { Args: { id: string }; Returns: undefined }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_duplicate_product: { Args: { id: string }; Returns: string }
      admin_import_products: { Args: { rows: Json }; Returns: Json }
      admin_reorder_product_images: {
        Args: { image_ids: string[]; product_id: string }
        Returns: undefined
      }
      admin_replace_variants: {
        Args: { option1: string[]; option2: string[]; product_id: string }
        Returns: Json
      }
      admin_save_commerce: {
        Args: { product_id: string; variants: Json }
        Returns: undefined
      }
      admin_save_product: { Args: { product: Json }; Returns: string }
      admin_save_variants: {
        Args: {
          color_note: string
          option1: string[]
          option1_name: string
          option2: string[]
          option2_name: string
          product_id: string
        }
        Returns: Json
      }
      admin_set_quote_note: {
        Args: { id: string; internal_note: string }
        Returns: undefined
      }
      admin_set_quote_status: {
        Args: {
          id: string
          lost_reason?: string
          note?: string
          to_status: Database["public"]["Enums"]["quote_status"]
        }
        Returns: undefined
      }
      create_quote_request: { Args: { payload: Json }; Returns: Json }
      has_unpublished_changes: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      mark_publish_run: {
        Args: {
          error?: string
          id: string
          run_url?: string
          status: Database["public"]["Enums"]["publish_status"]
        }
        Returns: undefined
      }
      name_from_slug: { Args: { slug: string }; Returns: string }
      next_folio: { Args: { issued_at?: string }; Returns: string }
      normalize_search_text: { Args: { value: string }; Returns: string }
      ping: { Args: never; Returns: string }
      product_search_text: {
        Args: {
          product_brand_id: string
          product_name: string
          product_sku: string
          product_tags: string[]
        }
        Returns: string
      }
      require_admin: { Args: never; Returns: undefined }
      require_staff: { Args: never; Returns: undefined }
      setting_flag: { Args: { flag: string }; Returns: boolean }
      slugify: { Args: { value: string }; Returns: string }
      split_list: { Args: { value: string }; Returns: string[] }
      variant_label: {
        Args: { option1: string; option2: string }
        Returns: string
      }
      variant_sku: {
        Args: { option1: string; option2: string; product_sku: string }
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
