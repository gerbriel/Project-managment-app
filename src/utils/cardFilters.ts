import { CardFilters, FilterOptions } from '@contexts/FilterContext';
import type { CardRow } from '../types/dto';

export function applyCardFilters(cards: CardRow[], filters: CardFilters, filterOptions: FilterOptions): CardRow[] {
  return cards.filter(card => {
    // Search text filter (only if enabled)
    if (filterOptions.enableSearchText && filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const titleMatch = card.title?.toLowerCase().includes(searchLower);
      const descriptionMatch = typeof card.description === 'string' ? 
        card.description.toLowerCase().includes(searchLower) : false;
      if (!titleMatch && !descriptionMatch) {
        return false;
      }
    }

    // Comment search filter (only if enabled)
    if (filterOptions.enableCommentSearch && filters.commentSearch) {
      const searchLower = filters.commentSearch.toLowerCase();
      const hasCommentMatch = card.comments?.some((comment: any) => 
        comment.content?.toLowerCase().includes(searchLower)
      );
      if (!hasCommentMatch) {
        return false;
      }
    }

    // Phone search filter (only if enabled)
    if (filterOptions.enablePhoneSearch && filters.phoneSearch) {
      const phonePattern = filters.phoneSearch.replace(/\D/g, ''); // Remove non-digits
      const hasPhoneMatch = card.card_field_values?.some((field: any) => {
        const fieldValue = typeof field.value === 'string' ? field.value.replace(/\D/g, '') : '';
        return fieldValue.includes(phonePattern);
      });
      if (!hasPhoneMatch) {
        return false;
      }
    }

    // Email search filter (only if enabled)
    if (filterOptions.enableEmailSearch && filters.emailSearch) {
      const searchLower = filters.emailSearch.toLowerCase();
      const hasEmailMatch = card.card_field_values?.some((field: any) => {
        const fieldValue = typeof field.value === 'string' ? field.value.toLowerCase() : '';
        return fieldValue.includes(searchLower) && fieldValue.includes('@');
      });
      if (!hasEmailMatch) {
        return false;
      }
    }

    // Status filter (only if enabled)
    if (filterOptions.enableStatus && filters.status === 'archived') {
      // You may need to adjust this logic based on how you handle archived cards
      return false; // Assuming no archived cards for now
    }

    // Labels filter (only if enabled)
    if (filterOptions.enableLabels && (filters.labels.length > 0 || filters.labelSearch)) {
      const cardLabels = card.card_labels || [];
      
      // Check for selected label IDs
      if (filters.labels.length > 0) {
        const hasMatchingLabel = filters.labels.some(labelId => 
          cardLabels.some((cardLabel: any) => {
            const label = Array.isArray(cardLabel.labels) ? cardLabel.labels[0] : cardLabel.labels;
            return label?.id === labelId;
          })
        );
        if (!hasMatchingLabel) {
          return false;
        }
      }
      
      // Check for label name search
      if (filters.labelSearch) {
        const searchLower = filters.labelSearch.toLowerCase();
        const hasMatchingLabelName = cardLabels.some((cardLabel: any) => {
          const label = Array.isArray(cardLabel.labels) ? cardLabel.labels[0] : cardLabel.labels;
          return label?.name?.toLowerCase().includes(searchLower);
        });
        if (!hasMatchingLabelName) {
          return false;
        }
      }
    }

    // Activity date filter (only if enabled)
    if (filterOptions.enableActivityDate && (filters.activityDate.from || filters.activityDate.to)) {
      let activityDates: Date[] = [];
      
      // Collect relevant dates based on activity type
      switch (filters.activityDate.type) {
        case 'created':
          activityDates.push(new Date(card.created_at));
          break;
        case 'edited':
          activityDates.push(new Date(card.updated_at));
          break;
        case 'commented':
          // Add comment dates if available
          if (card.comments) {
            activityDates.push(...card.comments.map((c: any) => new Date(c.created_at)).filter(d => !isNaN(d.getTime())));
          }
          break;
        case 'completed':
          // Add checklist completion dates if available
          if (card.checklists) {
            card.checklists.forEach((checklist: any) => {
              if (checklist.checklist_items) {
                checklist.checklist_items.forEach((item: any) => {
                  if (item.done && item.completed_at) {
                    activityDates.push(new Date(item.completed_at));
                  }
                });
              }
            });
          }
          break;
        case 'workflow_created':
          // This would need workflow data - for now use created_at
          activityDates.push(new Date(card.created_at));
          break;
        case 'any':
        default:
          // Include all activity dates
          activityDates.push(new Date(card.created_at));
          activityDates.push(new Date(card.updated_at));
          if (card.comments) {
            activityDates.push(...card.comments.map((c: any) => new Date(c.created_at)).filter(d => !isNaN(d.getTime())));
          }
          break;
      }
      
      // Filter out invalid dates and check if any date falls within range
      const validDates = activityDates.filter(d => !isNaN(d.getTime()));
      if (validDates.length > 0) {
        const hasDateInRange = validDates.some(date => {
          if (filters.activityDate.from && date < filters.activityDate.from) {
            return false;
          }
          if (filters.activityDate.to && date > filters.activityDate.to) {
            return false;
          }
          return true;
        });
        
        if (!hasDateInRange) {
          return false;
        }
      }
    }

    // Assigned to filter (only if enabled) - Note: CardRow doesn't have assignees field yet
    // This would need to be implemented when you add assignee functionality
    if (filterOptions.enableAssignedTo && filters.assignedTo.length > 0) {
      // For now, skip this filter since assignees aren't implemented in CardRow
      // You can add this when you implement the assignee feature
    }

    // Has attachments filter (only if enabled)
    if (filterOptions.enableAttachments && filters.hasAttachments === true) {
      const attachments = card.attachments || [];
      if (attachments.length === 0) {
        return false;
      }
    }

    // Has comments filter (only if enabled)
    if (filterOptions.enableComments && filters.hasComments === true) {
      const comments = card.comments || [];
      if (comments.length === 0) {
        return false;
      }
    }

    // Location search filter (only if enabled)
    if (filterOptions.enableLocation && filters.locationSearch) {
      const searchLower = filters.locationSearch.toLowerCase();
      const addressMatch = card.location_address?.toLowerCase().includes(searchLower);
      if (!addressMatch) {
        return false;
      }
    }

    // Has location filter (only if enabled)
    if (filterOptions.enableLocation && filters.hasLocation === true) {
      if (!card.location_address && !card.location_lat && !card.location_lng) {
        return false;
      }
    }

    return true;
  });
}

export function getFilterSummary(
  filters: CardFilters, 
  filterOptions: FilterOptions, 
  availableLabels?: Array<{id: string, name: string, color: string}>,
  locationSummary?: string
): string {
  const activeParts: string[] = [];

  if (filters.searchText) {
    activeParts.push(`"${filters.searchText}"`);
  }

  if (filterOptions.enableSearchText && filters.searchText) {
    activeParts.push('search text');
  }

  if (filterOptions.enableCommentSearch && filters.commentSearch) {
    activeParts.push('comment search');
  }

  if (filterOptions.enablePhoneSearch && filters.phoneSearch) {
    activeParts.push('phone search');
  }

  if (filterOptions.enableEmailSearch && filters.emailSearch) {
    activeParts.push('email search');
  }

  if (filterOptions.enableLocation && filters.locationSearch) {
    activeParts.push(`location: ${filters.locationSearch}`);
  }

  if (filterOptions.enableLabels && (filters.labels.length > 0 || filters.labelSearch)) {
    const parts: string[] = [];
    
    if (filters.labelSearch) {
      parts.push(`label search: "${filters.labelSearch}"`);
    }
    
    if (filters.labels.length > 0) {
      if (availableLabels) {
        const selectedLabels = availableLabels.filter(label => filters.labels.includes(label.id));
        if (selectedLabels.length === 1) {
          parts.push(`label: ${selectedLabels[0].name}`);
        } else if (selectedLabels.length <= 3) {
          parts.push(`labels: ${selectedLabels.map(l => l.name).join(', ')}`);
        } else {
          parts.push(`${selectedLabels.length} labels`);
        }
      } else {
        parts.push(`${filters.labels.length} label${filters.labels.length > 1 ? 's' : ''}`);
      }
    }
    
    if (parts.length > 0) {
      activeParts.push(parts.join(' + '));
    }
  }

  if (filterOptions.enableActivityDate && (filters.activityDate.from || filters.activityDate.to)) {
    const activityTypeNames = {
      any: 'activity',
      created: 'created',
      edited: 'edited', 
      commented: 'commented',
      completed: 'completed',
      workflow_created: 'workflow created'
    };
    activeParts.push(`activity on: ${activityTypeNames[filters.activityDate.type] || 'activity'}`);
  }

  if (filterOptions.enableAssignedTo && filters.assignedTo.length > 0) {
    activeParts.push(`${filters.assignedTo.length} assignee${filters.assignedTo.length > 1 ? 's' : ''}`);
  }

  if (filterOptions.enableStatus && filters.status !== 'active') {
    activeParts.push(`${filters.status} cards`);
  }

  if (filterOptions.enableAttachments && filters.hasAttachments) {
    activeParts.push('has attachments');
  }

  if (filterOptions.enableComments && filters.hasComments) {
    activeParts.push('has comments');
  }

  if (filterOptions.enableLocation && filters.hasLocation) {
    if (locationSummary) {
      activeParts.push(`location: ${locationSummary}`);
    } else {
      activeParts.push('has location');
    }
  }

  if (activeParts.length === 0) {
    return 'No filters';
  }

  if (activeParts.length === 1) {
    return `Filtered by ${activeParts[0]}`;
  }

  if (activeParts.length === 2) {
    return `Filtered by ${activeParts[0]} and ${activeParts[1]}`;
  }

  return `Filtered by ${activeParts.slice(0, -1).join(', ')} and ${activeParts[activeParts.length - 1]}`;
}