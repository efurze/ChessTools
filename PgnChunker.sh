#!/bin/bash

# Define the regular expression to match at the end of the line
END_REGEX="^1\. .+$"  # Replace with your actual regex
PROGRAM="node dist/StdinImporter.js"  # Replace with the program you want to run

# Initialize a variable to hold the chunk of input
chunk=""

# Read from stdin line by line
while IFS= read -r line; do
  # Add the current line to the chunk
  chunk+="$line"$'\n'

  # Check if the line ends with the regex
  if [[ $line =~ $END_REGEX ]]; then

    if ! [[ $chunk =~ "Chess960" || $chunk =~ "Fisher Random" || $chunk =~ "Fischer Random" || $chunk =~ "Freestyle Chess" ]]; then
      # Run the program with the chunk as input
      echo "$chunk" | $PROGRAM
    fi
    # Reset the chunk
    chunk=""
  fi
done