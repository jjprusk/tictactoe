# Development Ideas

Use this file to record ideas for future development

## How to use
- Add a new dated entry for each idea.
- Keep entries concise and link to related commits or PRs when possible.

## Entries

### [x] [2025-8-27]
- Context: UI only
- Idea: Rename Strategy to Opponent
- Implications: makes more sense to users
- Links:

### [x] [2025-8-27]
- Context: Stratify opponent levels
- Idea: Create a collection of opponent levels that are meaningful to the user and can be created and measured in a meaningful manner
- Implications: Method of managing a hierarchy of increasingly intelligent AI opponents
- Notes: AI levels go from AI0 to AI3 defined as follows:
#### AI0:
- AKA "Basic" level to users.
- Makes moves in a random manner with no strategy.
- Easily beaten
#### AI1:
- AKA "Average" level to users
- Has had some level of training and can be beaten approx. 2/3 of the time.
#### AI2:
- AKA "Smart" level to users
- Has had more training then AI1 and is beaten only 1/3 of the time.
#### AI3:
- AKA "Genius" level to users
- Extensive training and can never be beaten.

### [ ] [2025-8-27]
- Context: Update makeMove() interface
- Idea: makeMove() should accept all levels of AI (0-3)
- Implications: makeMove() only accepts the "Random" string at this point. It should accept AI0, AI1, AI2, and AI3 as strategies. THis is preparation for future implementing AI strategies beyond simple random play.
- Links:

### [ ] [2025-8-27]
- Context: Allow AI to AI play.
- Idea: Two AI's should be able to play games until either a time limit or number of games is reached. The goal would be for them to train and develop more knowledge / strategy.
- Implications: First order is to create a master AI (Genius level) incapable of loosing a game. This becomes a master AI, which can then be used to train other AI's which become capped at a specific loss ratio.
- Links:

### [ ] [2025-8-27]
- Context: 
- Idea: 
- Implications: 
- Links: