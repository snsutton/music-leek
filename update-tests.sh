#!/bin/bash
# Add totalRounds and isCompleted to mock League objects in tests
find src/__tests__ -name "*.test.ts" -type f -exec sed -i 's/participants: \[\([^]]*\)\],$/participants: [\1],\n      totalRounds: 10,\n      isCompleted: false,/g' {} \;
# Add notificationsSent to mock Round objects
find src/__tests__ -name "*.test.ts" -type f -exec sed -i 's/votes: \[\([^]]*\)\],$/votes: [\1],\n        notificationsSent: {\n          roundStarted: false,\n          submissionReminder: false,\n          votingStarted: false,\n          votingReminder: false,\n          allVotesReceived: false\n        },/g' {} \;
