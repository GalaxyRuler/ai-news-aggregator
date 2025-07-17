// Debug script to check for duplicate articles in API response
const fetch = require('node-fetch');

async function checkDuplicates() {
  try {
    const response = await fetch('http://localhost:5000/api/news');
    const articles = await response.json();
    
    console.log(`Total articles returned: ${articles.length}`);
    
    // Check for duplicate IDs
    const idCount = {};
    const duplicateIds = [];
    
    articles.forEach(article => {
      if (idCount[article.id]) {
        idCount[article.id]++;
        if (!duplicateIds.includes(article.id)) {
          duplicateIds.push(article.id);
        }
      } else {
        idCount[article.id] = 1;
      }
    });
    
    if (duplicateIds.length > 0) {
      console.log(`\nFound ${duplicateIds.length} duplicate IDs:`);
      duplicateIds.forEach(id => {
        console.log(`- ID ${id} appears ${idCount[id]} times`);
        const duplicates = articles.filter(a => a.id === id);
        duplicates.forEach((dup, index) => {
          console.log(`  ${index + 1}. "${dup.title.substring(0, 50)}..."`);
        });
      });
    } else {
      console.log('\nNo duplicate IDs found in the response.');
      
      // Check if there are duplicate titles
      const titleCount = {};
      articles.forEach(article => {
        const title = article.title.toLowerCase();
        titleCount[title] = (titleCount[title] || 0) + 1;
      });
      
      const duplicateTitles = Object.entries(titleCount)
        .filter(([title, count]) => count > 1)
        .sort((a, b) => b[1] - a[1]);
        
      if (duplicateTitles.length > 0) {
        console.log(`\nFound ${duplicateTitles.length} duplicate titles:`);
        duplicateTitles.slice(0, 5).forEach(([title, count]) => {
          console.log(`- "${title.substring(0, 50)}..." appears ${count} times`);
        });
      }
    }
    
    // Show first 5 articles
    console.log('\nFirst 5 articles:');
    articles.slice(0, 5).forEach((article, index) => {
      console.log(`${index + 1}. ID: ${article.id}, Title: "${article.title.substring(0, 50)}..."`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDuplicates();