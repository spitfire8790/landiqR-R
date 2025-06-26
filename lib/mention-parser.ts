/**
 * Utility functions for parsing @mentions in comment text and creating notifications
 */

import { createNotification, fetchPeople } from "./data-service";
import type { Person } from "./types";

/**
 * Extract @mentions from comment text
 * Returns array of mentioned usernames (without the @ symbol)
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    if (!mentions.includes(username)) {
      mentions.push(username);
    }
  }
  
  return mentions;
}

/**
 * Find people by their usernames/names and create mention notifications
 */
export async function createMentionNotifications(
  commentText: string,
  authorId: string,
  parentType: 'task' | 'responsibility',
  parentId: string
): Promise<void> {
  const mentions = extractMentions(commentText);
  if (mentions.length === 0) return;

  try {
    // Fetch all people to match against mentions
    const allPeople = await fetchPeople();
    
    // Find people whose names match the mentions (case-insensitive)
    const mentionedPeople = allPeople.filter((person) => {
      const firstName = person.name.split(' ')[0].toLowerCase();
      const fullName = person.name.toLowerCase().replace(/\s+/g, '');
      return mentions.some((mention) => {
        const mentionLower = mention.toLowerCase();
        return firstName === mentionLower || fullName === mentionLower;
      });
    });

    // Create notifications for each mentioned person (excluding the author)
    for (const person of mentionedPeople) {
      if (person.id !== authorId) {
        await createNotification({
          recipientId: person.id,
          type: 'mention',
          payload: {
            commentText: commentText.substring(0, 100) + (commentText.length > 100 ? '...' : ''),
            parentType,
            parentId,
            authorId,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error creating mention notifications:', error);
  }
}

/**
 * Highlight @mentions in text for display
 * Returns HTML string with mentions wrapped in spans
 */
export function highlightMentions(text: string): string {
  const mentionRegex = /@(\w+)/g;
  return text.replace(mentionRegex, '<span class="text-blue-600 font-medium">@$1</span>');
}
