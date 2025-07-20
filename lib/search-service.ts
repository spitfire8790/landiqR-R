import { supabase } from "./supabase";
import type { Group, Category, Person, Task } from "./types";

export interface SearchResult {
  id: string;
  title: string;
  type: "group" | "category" | "person" | "task";
  subtitle?: string;
  metadata?: string;
  rank?: number;
}

// Create search function in Postgres
export async function createSearchFunction(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create search function that uses full-text search
        CREATE OR REPLACE FUNCTION search_all_entities(search_query TEXT)
        RETURNS TABLE (
          id TEXT,
          title TEXT,
          type TEXT,
          subtitle TEXT,
          metadata TEXT,
          rank REAL
        )
        LANGUAGE SQL
        AS $$
        WITH search_results AS (
          -- Search groups
          SELECT 
            g.id::TEXT,
            g.name AS title,
            'group' AS type,
            g.description AS subtitle,
            (SELECT COUNT(*)::TEXT || ' categories' FROM categories c WHERE c."groupId" = g.id) AS metadata,
            ts_rank(to_tsvector('english', g.name || ' ' || COALESCE(g.description, '')), plainto_tsquery('english', search_query)) AS rank
          FROM groups g
          WHERE to_tsvector('english', g.name || ' ' || COALESCE(g.description, '')) @@ plainto_tsquery('english', search_query)
          
          UNION ALL
          
          -- Search categories  
          SELECT
            c.id::TEXT,
            c.name AS title,
            'category' AS type,
            c.description AS subtitle,
            g.name AS metadata,
            ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', search_query)) AS rank
          FROM categories c
          LEFT JOIN groups g ON g.id = c."groupId"
          WHERE to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', search_query)
          
          UNION ALL
          
          -- Search people
          SELECT
            p.id::TEXT,
            p.name AS title,
            'person' AS type,
            p.role AS subtitle,
            p.organisation AS metadata,
            ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.email, '') || ' ' || COALESCE(p.organisation, '') || ' ' || COALESCE(p.role, '')), plainto_tsquery('english', search_query)) AS rank
          FROM people p
          WHERE to_tsvector('english', p.name || ' ' || COALESCE(p.email, '') || ' ' || COALESCE(p.organisation, '') || ' ' || COALESCE(p.role, '')) @@ plainto_tsquery('english', search_query)
          
          UNION ALL
          
          -- Search tasks
          SELECT
            t.id::TEXT,
            t.name AS title,
            'task' AS type,
            t.description AS subtitle,
            c.name AS metadata,
            ts_rank(to_tsvector('english', t.name || ' ' || COALESCE(t.description, '')), plainto_tsquery('english', search_query)) AS rank
          FROM tasks t
          LEFT JOIN categories c ON c.id = t."categoryId"
          WHERE to_tsvector('english', t.name || ' ' || COALESCE(t.description, '')) @@ plainto_tsquery('english', search_query)
        )
        SELECT * FROM search_results
        ORDER BY rank DESC, title ASC
        LIMIT 20;
        $$;
      `
    });

    if (error) {
      console.error('Error creating search function:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating search function:', error);
    return false;
  }
}

// Perform search using the Postgres function
export async function searchEntities(query: string): Promise<SearchResult[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    // Ensure search function exists
    await createSearchFunction();

    const { data, error } = await supabase.rpc('search_all_entities', {
      search_query: query.trim()
    });

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Fallback client-side search if Postgres search fails
export function clientSideSearch(
  query: string,
  groups: Group[],
  categories: Category[],
  people: Person[],
  tasks: Task[]
): SearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search groups
  groups.forEach((group) => {
    if (
      group.name.toLowerCase().includes(lowerQuery) ||
      group.description?.toLowerCase().includes(lowerQuery)
    ) {
      results.push({
        id: group.id,
        title: group.name,
        type: "group",
        subtitle: group.description,
        metadata: `${categories.filter(c => c.groupId === group.id).length} categories`,
      });
    }
  });

  // Search categories
  categories.forEach((category) => {
    if (
      category.name.toLowerCase().includes(lowerQuery) ||
      category.description?.toLowerCase().includes(lowerQuery)
    ) {
      const group = groups.find(g => g.id === category.groupId);
      results.push({
        id: category.id,
        title: category.name,
        type: "category",
        subtitle: category.description,
        metadata: group?.name,
      });
    }
  });

  // Search people
  people.forEach((person) => {
    if (
      person.name.toLowerCase().includes(lowerQuery) ||
      person.email?.toLowerCase().includes(lowerQuery) ||
      person.organisation?.toLowerCase().includes(lowerQuery) ||
      person.role?.toLowerCase().includes(lowerQuery)
    ) {
      results.push({
        id: person.id,
        title: person.name,
        type: "person",
        subtitle: person.role,
        metadata: person.organisation,
      });
    }
  });

  // Search tasks
  tasks.forEach((task) => {
    if (
      task.name.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery)
    ) {
      const category = categories.find(c => c.id === task.categoryId);
      results.push({
        id: task.id,
        title: task.name,
        type: "task",
        subtitle: task.description,
        metadata: category?.name,
      });
    }
  });

  // Sort by relevance (exact matches first, then partial matches)
  results.sort((a, b) => {
    const aExactMatch = a.title.toLowerCase() === lowerQuery;
    const bExactMatch = b.title.toLowerCase() === lowerQuery;
    
    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;
    
    return a.title.localeCompare(b.title);
  });

  return results.slice(0, 20);
}

// Hybrid search: try Postgres first, fallback to client-side
export async function performSearch(
  query: string,
  fallbackData?: {
    groups: Group[];
    categories: Category[];
    people: Person[];
    tasks: Task[];
  }
): Promise<SearchResult[]> {
  try {
    // Try Postgres search first
    const results = await searchEntities(query);
    
    if (results.length > 0) {
      return results;
    }

    // Fallback to client-side search if available
    if (fallbackData) {
      return clientSideSearch(
        query,
        fallbackData.groups,
        fallbackData.categories,
        fallbackData.people,
        fallbackData.tasks
      );
    }

    return [];
  } catch (error) {
    console.error('Search failed:', error);
    
    // Fallback to client-side search if available
    if (fallbackData) {
      return clientSideSearch(
        query,
        fallbackData.groups,
        fallbackData.categories,
        fallbackData.people,
        fallbackData.tasks
      );
    }

    return [];
  }
} 