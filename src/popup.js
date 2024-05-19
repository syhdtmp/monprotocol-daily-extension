const API_BASE = "https://app.monprotocol.ai/api/trpc";
const COMMON_HEADERS = {
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.7",
  "content-type": "application/json",
  "sec-ch-ua": "\"Chromium\";v=\"125\", \"Google Chrome\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "sec-gpc": "1"
};
const COMMON_FETCH_OPTIONS = {
  "headers": COMMON_HEADERS,
  "referrer": "https://app.monprotocol.ai/questing/missions",
  "referrerPolicy": "strict-origin-when-cross-origin",
  "mode": "cors",
  "credentials": "include"
};

async function fetchWheelSpin() {
  try {
    const response = await fetch(`${API_BASE}/quests.wheelSpin`, {
      "headers": {
        ...COMMON_HEADERS,
        "priority": "u=1, i",
        "sec-ch-ua": "\"Brave\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
        "x-trpc-source": "react"
      },
      "referrer": "https://app.monprotocol.ai/questing/missions",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": "{\"json\":null,\"meta\":{\"values\":[\"undefined\"]}}",
      "method": "POST",
      "mode": "cors",
      "credentials": "include"
    });
    const data = await response.json();
    if (data.error) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: errorLogger,
          args: [`Error: ${data.error.json.message}`]
        });
      });
      return null; // Return null if there was an error (e.g., user already spun)
    }
    return data.result.data.json.pointsWon;
  } catch (error) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: errorLogger,
        args: ['Fetch Wheel Spin Error:', error]
      });
    });
    return null;
  }
}

async function fetchQuests() {
  try {
    const response = await fetch(`${API_BASE}/quests.quests?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D`, {
      ...COMMON_FETCH_OPTIONS,
      "method": "GET",
      "body": null
    });
    return await response.json();
  } catch (error) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: errorLogger,
        args: ['Fetch Quests Error:', error]
      });
    });
    return null;
  }
}

async function setQuestCompletion(questId) {
  try {
    await fetch(`${API_BASE}/quests.setQuestCompletion`, {
      ...COMMON_FETCH_OPTIONS,
      "method": "POST",
      "body": JSON.stringify({ "json": questId })
    });
  } catch (error) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: errorLogger,
        args: ['Set Quest Completion Error:', error]
      });
    });
  }
}

async function fetchAndCompleteQuests() {
  try {
    const pointsWon = await fetchWheelSpin();
    if (pointsWon === null) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: logMessage,
          args: ['No points won: User has already spun the wheel.']
        });
      });
    } else {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: logMessage,
          args: [`Points won from wheel spin: ${pointsWon}`]
        });
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: alert,
          args: [`You won ${pointsWon} points from the wheel spin!`]
        });
      });
    }

    const questsData = await fetchQuests();
    let completedQuestsCount = 0;
    let completedQuestsList = [];
    if (questsData) {
      for (const questWrapper of questsData.result.data.json) {
        const quest = questWrapper.quests;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: logMessage,
            args: [questWrapper.user_quest_completion ? `Quest "${quest.title}" is already completed.` : `Processing quest: ${quest.title}`]
          });
        });
        if (!questWrapper.user_quest_completion) {
          await setQuestCompletion(quest.id);
          completedQuestsCount++;
          completedQuestsList.push(quest.title);
        }
      }
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: alertWrapper,
          args: [`Total completed quests: ${completedQuestsCount}\nCompleted Quests: ${completedQuestsList.join(', ')}`]
        });
      });
    }
  } catch (error) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: errorLogger,
        args: ['Failed to fetch or complete quests:', error]
      });
    });
  }
}

// Integrate with existing button in popup.html to trigger quest completion
document.addEventListener('DOMContentLoaded', function () {
  var checkButton = document.getElementById('completeQuestsButton');
  checkButton.addEventListener('click', function () {
    fetchAndCompleteQuests();
  });
});

// Helper functions for logging and error handling
function logMessage(message) {
  console.log(message);
}

function errorLogger(message, error) {
  console.error(message, error);
}

function alertWrapper(message) {
  alert(message)
}