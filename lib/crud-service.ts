import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

interface BaseEntity {
  id: string;
  created_at?: string;
}

interface CrudConfig<T> {
  tableName: string;
  mapFromDb: (dbItem: any) => T;
  mapToDb: (item: Omit<T, 'id' | 'created_at'>) => any;
}

export class CrudService<T extends BaseEntity> {
  constructor(private config: CrudConfig<T>) {}

  async fetchAll(): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(this.config.tableName)
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error(`Error fetching ${this.config.tableName}:`, error);
        return [];
      }

      return data.map(this.config.mapFromDb);
    } catch (error) {
      console.error(`Error in fetch${this.config.tableName}:`, error);
      return [];
    }
  }

  async create(item: Omit<T, 'id' | 'created_at'>): Promise<T | null> {
    try {
      const newItem = {
        id: uuidv4(),
        ...this.config.mapToDb(item),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(this.config.tableName)
        .insert([newItem])
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${this.config.tableName}:`, error);
        return null;
      }

      return this.config.mapFromDb(data);
    } catch (error) {
      console.error(`Error in create${this.config.tableName}:`, error);
      return null;
    }
  }

  async update(item: T): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.config.tableName)
        .update(this.config.mapToDb(item as any))
        .eq("id", item.id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${this.config.tableName}:`, error);
        return null;
      }

      return this.config.mapFromDb(data);
    } catch (error) {
      console.error(`Error in update${this.config.tableName}:`, error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.config.tableName)
        .delete()
        .eq("id", id);

      if (error) {
        console.error(`Error deleting ${this.config.tableName}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error in delete${this.config.tableName}:`, error);
      return false;
    }
  }

  async fetchById(id: string): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(this.config.tableName)
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(`Error fetching ${this.config.tableName} by id:`, error);
        return null;
      }

      return this.config.mapFromDb(data);
    } catch (error) {
      console.error(`Error in fetch${this.config.tableName}ById:`, error);
      return null;
    }
  }
}

// Example usage for Groups
import type { Group } from "@/lib/types";

export const groupsService = new CrudService<Group>({
  tableName: "groups",
  mapFromDb: (group) => ({
    id: group.id,
    name: group.name,
    description: group.description || "",
    icon: group.icon || "Folder",
    created_at: group.created_at,
  }),
  mapToDb: (group) => ({
    name: group.name,
    description: group.description,
    icon: group.icon,
  }),
}); 