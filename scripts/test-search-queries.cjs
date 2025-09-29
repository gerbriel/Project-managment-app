#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSearchQueries() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  console.log('🧪 Testing Search Query Fixes');
  console.log('============================');
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Cards search with title query + JS description filtering
  console.log('\n📝 Test 1: Cards search with JS description filtering...');
  try {
    const [titleResults, allCardsResults] = await Promise.all([
      supabase
        .from('cards')
        .select('id, title, description, list_id, board_id')
        .ilike('title', '%test%')
        .limit(3),
      supabase
        .from('cards')  
        .select('id, title, description, list_id, board_id')
        .limit(10)
    ]);

    const cardsError = titleResults.error || allCardsResults.error;
    if (cardsError) {
      console.log('❌ Cards query failed:', cardsError.message);
    } else {
      const titleCards = titleResults.data || [];
      const allCards = allCardsResults.data || [];
      
      // Filter description matches in JS
      const descMatches = allCards.filter(card => {
        const descText = card.description ? JSON.stringify(card.description).toLowerCase() : '';
        return descText.includes('test');
      });
      
      console.log('✅ Cards query successful - Title:', titleCards.length, 'Description:', descMatches.length, 'from', allCards.length, 'total');
      
      if (titleCards.length > 0 || descMatches.length > 0) {
        const sampleCard = titleCards[0] || descMatches[0];
        console.log('📋 Sample card:', {
          id: sampleCard.id,
          title: sampleCard.title,
          descriptionType: typeof sampleCard.description
        });
      }
    }
  } catch (error) {
    console.log('❌ Cards search error:', error.message);
  }

  // Test 2: card_field_values with JavaScript filtering (like our fixed search)
  console.log('\n🔧 Test 2: Custom field values with JS filtering...');
  try {
    const { data: allFieldValues, error: fieldError } = await supabase
      .from('card_field_values')
      .select('value, card_id, field_id')
      .limit(10);

    if (fieldError) {
      console.log('❌ Field values query failed:', fieldError.message);
    } else {
      // Filter in JavaScript
      const fieldValues = allFieldValues?.filter(fv => {
        const valueText = fv.value ? JSON.stringify(fv.value).toLowerCase() : '';
        return valueText.includes('test');
      }) || [];
      
      console.log('✅ Field values query successful:', fieldValues.length, 'matching results from', allFieldValues?.length || 0, 'total');
      if (fieldValues.length > 0) {
        console.log('📋 Sample field value:', {
          card_id: fieldValues[0].card_id,
          field_id: fieldValues[0].field_id,
          valueType: typeof fieldValues[0].value,
          value: fieldValues[0].value
        });
      }
    }
  } catch (error) {
    console.log('❌ Field values search error:', error.message);
  }

  // Test 3: Check card_field_values table structure
  console.log('\n🏗️ Test 3: Verifying card_field_values structure...');
  try {
    const { data: fieldValues, error: structureError } = await supabase
      .from('card_field_values')
      .select('*')
      .limit(1);

    if (structureError) {
      console.log('❌ Structure check failed:', structureError.message);
    } else if (fieldValues && fieldValues.length > 0) {
      console.log('✅ Table structure verified');
      console.log('📋 Available columns:', Object.keys(fieldValues[0]));
    } else {
      console.log('⚠️ No data in card_field_values table');
    }
  } catch (error) {
    console.log('❌ Structure check error:', error.message);
  }

  // Test 4: Basic separate queries (like our fixed search does)
  console.log('\n🔍 Test 4: Separate query strategy...');
  try {
    // Get cards first
    const { data: cards } = await supabase
      .from('cards')
      .select('id, title, list_id, board_id')
      .limit(2);

    if (cards && cards.length > 0) {
      // Get lists and boards separately
      const listIds = [...new Set(cards.map(c => c.list_id).filter(Boolean))];
      const boardIds = [...new Set(cards.map(c => c.board_id).filter(Boolean))];

      const [listsData, boardsData] = await Promise.all([
        listIds.length > 0 ? supabase.from('lists').select('id, name').in('id', listIds) : { data: [] },
        boardIds.length > 0 ? supabase.from('boards').select('id, name').in('id', boardIds) : { data: [] }
      ]);

      console.log('✅ Separate queries successful');
      console.log('📋 Cards:', cards.length, 'Lists:', listsData.data?.length || 0, 'Boards:', boardsData.data?.length || 0);
    } else {
      console.log('⚠️ No cards found for separate query test');
    }
  } catch (error) {
    console.log('❌ Separate queries error:', error.message);
  }

  console.log('\n🎉 Search query tests completed!');
}

testSearchQueries().catch(console.error);