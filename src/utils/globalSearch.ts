import { getSupabase } from '@app/supabaseClient';
import type { SearchResult, SearchFilters } from '@contexts/SearchContext';

export async function performGlobalSearch(query: string, filters: SearchFilters): Promise<SearchResult[]> {
  const supabase = getSupabase();
  const searchTerm = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  try {
    // Search Boards
    if (filters.includeBoards) {
      const { data: boards } = await supabase
        .from('boards')
        .select('id, name, workspace_id')
        .ilike('name', `%${searchTerm}%`);

      if (boards) {
        boards.forEach(board => {
          results.push({
            id: `board-${board.id}`,
            type: 'board',
            title: board.name,
            subtitle: 'Board',
            boardId: board.id,
            url: `/b/${board.id}/board`,
            matchedField: 'name',
            matchedText: board.name,
            icon: 'board',
          });
        });
      }
    }

    // Search Lists
    if (filters.includeLists) {
      const { data: lists } = await supabase
        .from('lists')
        .select('id, name, board_id, boards(name)')
        .ilike('name', `%${searchTerm}%`);

      if (lists) {
        lists.forEach((list: any) => {
          results.push({
            id: `list-${list.id}`,
            type: 'list',
            title: list.name,
            subtitle: `List in ${list.boards?.name || 'Board'}`,
            boardId: list.board_id,
            listId: list.id,
            url: `/b/${list.board_id}/board`,
            matchedField: 'name',
            matchedText: list.name,
            icon: 'board',
          });
        });
      }
    }

    // Search Cards - title and description
    if (filters.includeCards) {
      try {
          // Get cards by title, then filter for description matches in JavaScript
          const { data: titleCards, error: titleError } = await supabase
            .from('cards')
            .select('id, title, description, list_id, board_id')
            .ilike('title', `%${searchTerm}%`);

          // Get additional cards to check descriptions (limited for performance)
          const { data: allCards, error: allCardsError } = await supabase
            .from('cards')
            .select('id, title, description, list_id, board_id')
            .limit(500); // Limit to prevent performance issues

          const cardsError = titleError || allCardsError;
          
          // Combine title matches with description matches (filtered in JS)
          const cardsMap = new Map();
          
          // Add title matches
          (titleCards || []).forEach(card => cardsMap.set(card.id, card));
          
          // Add description matches (filter in JavaScript)
          (allCards || []).forEach(card => {
            const descriptionText = card.description ? JSON.stringify(card.description).toLowerCase() : '';
            if (descriptionText.includes(searchTerm.toLowerCase())) {
              cardsMap.set(card.id, card);
            }
          });
          
          const cards = Array.from(cardsMap.values());        if (cardsError) {
          console.warn('Cards search error:', cardsError);
        } else if (cards) {
          // Get list and board names separately to avoid join issues
          const listIds = [...new Set(cards.map(c => c.list_id).filter(Boolean))];
          const boardIds = [...new Set(cards.map(c => c.board_id).filter(Boolean))];
          
          const [listsData, boardsData] = await Promise.all([
            listIds.length > 0 ? supabase.from('lists').select('id, name').in('id', listIds) : { data: [] },
            boardIds.length > 0 ? supabase.from('boards').select('id, name').in('id', boardIds) : { data: [] }
          ]);

          const listsMap = new Map((listsData.data || []).map(l => [l.id, l.name]));
          const boardsMap = new Map((boardsData.data || []).map(b => [b.id, b.name]));

          cards.forEach((card: any) => {
            const matchedTitle = card.title?.toLowerCase().includes(searchTerm);
            // Handle JSONB description - convert to string for search matching
            const descriptionText = card.description ? JSON.stringify(card.description) : '';
            const matchedDescription = descriptionText.toLowerCase().includes(searchTerm);

            results.push({
              id: `card-${card.id}`,
              type: 'card',
              title: card.title,
              subtitle: `Card in ${listsMap.get(card.list_id) || 'List'} • ${boardsMap.get(card.board_id) || 'Board'}`,
              description: descriptionText || undefined,
              boardId: card.board_id,
              listId: card.list_id,
              cardId: card.id,
              url: `/b/${card.board_id}/board?card=${card.id}`,
              matchedField: matchedTitle ? 'title' : matchedDescription ? 'description' : 'content',
              matchedText: matchedTitle ? card.title : descriptionText,
              icon: 'card',
            });
          });
        }
      } catch (error) {
        console.warn('Error searching cards:', error);
      }
    }

    // Search Comments
    if (filters.includeComments) {
      try {
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select(`
            id, body, card_id
          `)
          .ilike('body', `%${searchTerm}%`);

        if (commentsError) {
          console.warn('Comments search error:', commentsError);
        } else if (comments && comments.length > 0) {
          // Get card info separately
          const cardIds = [...new Set(comments.map(c => c.card_id).filter(Boolean))];
          const { data: cardsData } = await supabase
            .from('cards')
            .select('id, title, list_id, board_id')
            .in('id', cardIds);

          const cardsMap = new Map((cardsData || []).map(c => [c.id, c]));

          // Get list and board names
          const listIds = [...new Set((cardsData || []).map(c => c.list_id).filter(Boolean))];
          const boardIds = [...new Set((cardsData || []).map(c => c.board_id).filter(Boolean))];
          
          const [listsData, boardsData] = await Promise.all([
            listIds.length > 0 ? supabase.from('lists').select('id, name').in('id', listIds) : { data: [] },
            boardIds.length > 0 ? supabase.from('boards').select('id, name').in('id', boardIds) : { data: [] }
          ]);

          const listsMap = new Map((listsData.data || []).map(l => [l.id, l.name]));
          const boardsMap = new Map((boardsData.data || []).map(b => [b.id, b.name]));

          comments.forEach((comment: any) => {
            const card = cardsMap.get(comment.card_id);
            if (card) {
              results.push({
                id: `comment-${comment.id}`,
                type: 'comment',
                title: `Comment: "${comment.body?.substring(0, 50)}${comment.body?.length > 50 ? '...' : ''}"`,
                subtitle: `Comment on ${card.title || 'Card'} • ${listsMap.get(card.list_id) || 'List'} • ${boardsMap.get(card.board_id) || 'Board'}`,
                boardId: card.board_id,
                listId: card.list_id,
                cardId: card.id,
                url: `/b/${card.board_id}/board?card=${card.id}`,
                matchedField: 'body',
                matchedText: comment.body,
                icon: 'comment',
              });
            }
          });
        }
      } catch (error) {
        console.warn('Error searching comments:', error);
      }
    }

    // Search Custom Fields
    if (filters.includeCustomFields) {
      try {
        // Get all field values and filter in JavaScript due to JSONB casting limitations
        const { data: allFieldValues, error: fieldError } = await supabase
          .from('card_field_values')
          .select(`
            value, card_id, field_id
          `);

        const customFieldValues = allFieldValues?.filter(fv => {
          const valueText = fv.value ? JSON.stringify(fv.value).toLowerCase() : '';
          return valueText.includes(searchTerm.toLowerCase());
        }) || [];

        if (fieldError) {
          console.warn('Custom fields search error:', fieldError);
        } else if (customFieldValues && customFieldValues.length > 0) {
          // Get related data separately
          const cardIds = [...new Set(customFieldValues.map(fv => fv.card_id).filter(Boolean))];
          const fieldIds = [...new Set(customFieldValues.map(fv => fv.field_id).filter(Boolean))];
          
          const [cardsData, fieldsData] = await Promise.all([
            cardIds.length > 0 ? supabase.from('cards').select('id, title, list_id, board_id').in('id', cardIds) : { data: [] },
            fieldIds.length > 0 ? supabase.from('custom_field_defs').select('id, name').in('id', fieldIds) : { data: [] }
          ]);

          const cardsMap = new Map((cardsData.data || []).map(c => [c.id, c]));
          const fieldsMap = new Map((fieldsData.data || []).map(f => [f.id, f.name]));

          // Get list and board names for the cards
          const listIds = [...new Set((cardsData.data || []).map(c => c.list_id).filter(Boolean))];
          const boardIds = [...new Set((cardsData.data || []).map(c => c.board_id).filter(Boolean))];
          
          const [listsData, boardsData] = await Promise.all([
            listIds.length > 0 ? supabase.from('lists').select('id, name').in('id', listIds) : { data: [] },
            boardIds.length > 0 ? supabase.from('boards').select('id, name').in('id', boardIds) : { data: [] }
          ]);

          const listsMap = new Map((listsData.data || []).map(l => [l.id, l.name]));
          const boardsMap = new Map((boardsData.data || []).map(b => [b.id, b.name]));

          customFieldValues.forEach((fieldValue: any) => {
            const card = cardsMap.get(fieldValue.card_id);
            const fieldName = fieldsMap.get(fieldValue.field_id);
            // Handle JSONB value - convert to string for display
            const valueText = fieldValue.value ? JSON.stringify(fieldValue.value).replace(/^"|"$/g, '') : '';
            
            if (card) {
              results.push({
                id: `custom-field-${fieldValue.card_id}-${fieldValue.field_id}`,
                type: 'custom_field',
                title: `${fieldName || 'Field'}: ${valueText}`,
                subtitle: `Custom field on ${card.title || 'Card'} • ${listsMap.get(card.list_id) || 'List'} • ${boardsMap.get(card.board_id) || 'Board'}`,
                boardId: card.board_id,
                listId: card.list_id,
                cardId: card.id,
                url: `/b/${card.board_id}/board?card=${card.id}`,
                matchedField: 'value',
                matchedText: valueText,
                icon: 'edit',
              });
            }
          });
        }
      } catch (error) {
        console.warn('Error searching custom fields:', error);
      }
    }

    // Search for contact information (phone numbers and emails in custom fields and descriptions)
    if (filters.includeContacts) {
      try {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;

        // Search for emails and phone numbers in card descriptions
        const { data: contactCards, error: contactCardsError } = await supabase
          .from('cards')
          .select(`
            id, title, description, list_id, board_id
          `);

        if (contactCardsError) {
          console.warn('Contact cards search error:', contactCardsError);
        } else if (contactCards) {
          // Get list and board names separately
          const listIds = [...new Set(contactCards.map(c => c.list_id).filter(Boolean))];
          const boardIds = [...new Set(contactCards.map(c => c.board_id).filter(Boolean))];
          
          const [listsData, boardsData] = await Promise.all([
            listIds.length > 0 ? supabase.from('lists').select('id, name').in('id', listIds) : { data: [] },
            boardIds.length > 0 ? supabase.from('boards').select('id, name').in('id', boardIds) : { data: [] }
          ]);

          const listsMap = new Map((listsData.data || []).map(l => [l.id, l.name]));
          const boardsMap = new Map((boardsData.data || []).map(b => [b.id, b.name]));

          contactCards.forEach((card: any) => {
            // Handle JSONB description - convert to string for search
            const descriptionText = card.description ? JSON.stringify(card.description) : '';
            if (descriptionText) {
              const description = descriptionText.toLowerCase();
              const queryLower = searchTerm.toLowerCase();
              
              // Check if search term looks like email or phone
              const isEmailQuery = emailRegex.test(queryLower);
              const isPhoneQuery = phoneRegex.test(queryLower.replace(/\D/g, ''));
              
              if (isEmailQuery || isPhoneQuery || 
                  description.includes(queryLower) && 
                  (emailRegex.test(description) || phoneRegex.test(description))) {
                
                const emails = descriptionText.match(emailRegex) || [];
                const phones = descriptionText.match(phoneRegex) || [];
                
                const contacts = [...emails, ...phones].filter(contact => 
                  contact.toLowerCase().includes(queryLower)
                );

                contacts.forEach(contact => {
                  results.push({
                    id: `contact-${card.id}-${contact}`,
                    type: 'contact',
                    title: contact,
                    subtitle: `Contact in ${card.title} • ${listsMap.get(card.list_id) || 'List'} • ${boardsMap.get(card.board_id) || 'Board'}`,
                    boardId: card.board_id,
                    listId: card.list_id,
                    cardId: card.id,
                    url: `/b/${card.board_id}/board?card=${card.id}`,
                    matchedField: 'contact',
                    matchedText: contact,
                    icon: contact.includes('@') ? 'mail' : 'phone',
                  });
                });
              }
            }
          });
        }

        // Search for emails and phone numbers in custom field values (no id column)
        const { data: contactFields, error: contactFieldsError } = await supabase
          .from('card_field_values')
          .select(`
            value, card_id, field_id
          `);

        if (contactFieldsError) {
          console.warn('Contact fields search error:', contactFieldsError);
        } else if (contactFields && contactFields.length > 0) {
          // Get related data separately
          const cardIds = [...new Set(contactFields.map(fv => fv.card_id).filter(Boolean))];
          const fieldIds = [...new Set(contactFields.map(fv => fv.field_id).filter(Boolean))];
          
          const [cardsData, fieldsData] = await Promise.all([
            cardIds.length > 0 ? supabase.from('cards').select('id, title, list_id, board_id').in('id', cardIds) : { data: [] },
            fieldIds.length > 0 ? supabase.from('custom_field_defs').select('id, name').in('id', fieldIds) : { data: [] }
          ]);

          const cardsMap = new Map((cardsData.data || []).map(c => [c.id, c]));
          const fieldsMap = new Map((fieldsData.data || []).map(f => [f.id, f.name]));

          contactFields.forEach((fieldValue: any) => {
            // Handle JSONB value - convert to string and clean up quotes
            const value = fieldValue.value ? JSON.stringify(fieldValue.value).replace(/^"|"$/g, '') : '';
            const valueLower = value.toLowerCase();
            
            if (valueLower.includes(searchTerm.toLowerCase()) &&
                (emailRegex.test(value) || phoneRegex.test(value))) {
              
              const card = cardsMap.get(fieldValue.card_id);
              const fieldName = fieldsMap.get(fieldValue.field_id);
              
              if (card) {
                results.push({
                  id: `contact-field-${fieldValue.card_id}-${fieldValue.field_id}`,
                  type: 'contact',
                  title: value,
                  subtitle: `${fieldName || 'Field'} in ${card.title || 'Card'} • Board`,
                  boardId: card.board_id,
                  listId: card.list_id,
                  cardId: card.id,
                  url: `/b/${card.board_id}/board?card=${card.id}`,
                  matchedField: 'contact',
                  matchedText: value,
                  icon: value.includes('@') ? 'mail' : 'phone',
                });
              }
            }
          });
        }
      } catch (error) {
        console.warn('Error searching contacts:', error);
      }
    }

    // Sort results by relevance (exact matches first, then partial matches)
    return results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === searchTerm;
      const bExact = b.title.toLowerCase() === searchTerm;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStarts = a.title.toLowerCase().startsWith(searchTerm);
      const bStarts = b.title.toLowerCase().startsWith(searchTerm);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.title.localeCompare(b.title);
    });

  } catch (error) {
    console.error('Global search error:', error);
    return [];
  }
}

export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
}

export function getSearchIcon(type: SearchResult['type']): string {
  switch (type) {
    case 'board': return 'board';
    case 'list': return 'board';
    case 'card': return 'edit';
    case 'comment': return 'comment';
    case 'custom_field': return 'edit';
    case 'contact': return 'mail';
    default: return 'more';
  }
}