const fs = require('fs');
const path = require('path');

const DATA_FILE_PATH = path.join(__dirname, 'public', 'portfolio-data.json');

async function scrapeStats() {
  console.log('Reading portfolio-data.json...');
  let data;
  try {
    const rawData = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    data = JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading portfolio data file:', error);
    process.exit(1);
  }

  let githubUser = data.personal?.socials?.github;
  let leetcodeUser = data.personal?.socials?.leetcode;

  if (!githubUser && !leetcodeUser) {
    console.log('No GitHub or LeetCode usernames found in portfolio-data.json.');
    return;
  }

  // Extract raw usernames if full URLs are provided
  let githubUsername = githubUser;
  if (githubUser && githubUser.includes('github.com')) {
    const match = githubUser.match(/github\.com\/([^\/]+)/i);
    if (match) githubUsername = match[1];
  }

  let leetcodeUsername = leetcodeUser;
  if (leetcodeUser && leetcodeUser.includes('leetcode.com')) {
    const match = leetcodeUser.match(/leetcode\.com\/(?:u\/)?([^\/]+)/i);
    if (match) leetcodeUsername = match[1];
  }

  console.log(`Starting stats update for GitHub: "${githubUsername}" and LeetCode: "${leetcodeUsername}"`);

  // 1. Fetch LeetCode Stats
  if (leetcodeUsername) {
    console.log(`Fetching LeetCode stats for "${leetcodeUsername}"...`);
    const query = `
      query userProblemsSolved($username: String!) {
        allQuestionsCount {
          difficulty
          count
        }
        matchedUser(username: $username) {
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({ query, variables: { username: leetcodeUsername } })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.errors) {
          console.error('LeetCode API errors:', json.errors[0]?.message || json.errors);
        } else if (json.data && json.data.matchedUser) {
          const allQs = json.data.allQuestionsCount || [];
          const acStats = json.data.matchedUser.submitStats?.acSubmissionNum || [];

          // Map total questions count
          const totalAll = allQs.find(q => q.difficulty === 'All')?.count || 3200;
          const totalEasy = allQs.find(q => q.difficulty === 'Easy')?.count || 800;
          const totalMedium = allQs.find(q => q.difficulty === 'Medium')?.count || 1600;
          const totalHard = allQs.find(q => q.difficulty === 'Hard')?.count || 800;

          // Map solved counts
          const solvedAll = acStats.find(q => q.difficulty === 'All')?.count || 0;
          const solvedEasy = acStats.find(q => q.difficulty === 'Easy')?.count || 0;
          const solvedMedium = acStats.find(q => q.difficulty === 'Medium')?.count || 0;
          const solvedHard = acStats.find(q => q.difficulty === 'Hard')?.count || 0;

          data.stats.leetcode = {
            ...data.stats.leetcode,
            solved: solvedAll,
            easy: solvedEasy,
            medium: solvedMedium,
            hard: solvedHard,
            totalQuestions: totalAll,
            easyTotal: totalEasy,
            mediumTotal: totalMedium,
            hardTotal: totalHard
          };
          console.log(`LeetCode stats updated: ${solvedAll} solved (${solvedEasy} E, ${solvedMedium} M, ${solvedHard} H)`);
        } else {
          console.warn(`User "${leetcodeUsername}" not found or has empty stats on LeetCode.`);
        }
      } else {
        console.error(`LeetCode HTTP Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to update LeetCode statistics:', error);
    }
  }

  // 2. Fetch GitHub Stats
  if (githubUsername) {
    console.log(`Fetching GitHub profile for "${githubUsername}"...`);
    try {
      const profileRes = await fetch(`https://api.github.com/users/${githubUsername}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        data.stats.github.repos = profileData.public_repos || 0;
        data.stats.github.followers = profileData.followers || 0;
        console.log(`GitHub profile stats updated: ${profileData.public_repos} repos, ${profileData.followers} followers`);
      } else {
        console.error(`GitHub API Error: ${profileRes.status}`);
      }

      console.log(`Scraping GitHub contributions for "${githubUsername}"...`);
      const contribRes = await fetch(`https://github.com/users/${githubUsername}/contributions`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      if (contribRes.ok) {
        const html = await contribRes.text();
        const match = html.match(/(\d+,?\d*)\s+contributions\s+in\s+the\s+last\s+year/i);
        if (match) {
          const count = parseInt(match[1].replace(/,/g, ''), 10);
          data.stats.github.contributionsYTD = count;
          console.log(`GitHub contributions updated: ${count}`);
        } else {
          console.warn('Could not parse contributions count from GitHub page.');
        }
      } else {
        console.error(`GitHub Contributions Page Error: ${contribRes.status}`);
      }
    } catch (error) {
      console.error('Failed to update GitHub statistics:', error);
    }
  }

  // 3. Write back to portfolio-data.json
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('portfolio-data.json successfully updated!');
  } catch (error) {
    console.error('Error writing to portfolio-data.json:', error);
  }
}

scrapeStats();
