Turing_Machine
==============

A turing machine simulator web application.

This simulator is based on work done by Suzanne Britton.  Her version is a Java application embedded on a web page.  She can be found at http://ironphoenix.org/tril/

The project was developed over the course of my final semester as a Computer Science undergrad at Appalachian State University for the CS 4800 - Capstone class.  It's currently used by Dr. Dee Parks in her CS 2490 - Introduction to Theoretical Computer Science class.

The layout for the pre-defined programs (Palindrome Detector, Subtractor, etc.) is the input string on the first line of the file followed by a single state transition on each line after.  I use .txt files, and haven't had any problems thus far.  I'll show the Subtractor program as an example:

111111-1111=            |The input string for the program
START,_  START,_,>      |First transition in the transition table
START,1  START,1,>      |               ^
START,_  START,_,>      |               |
START,=  2,_,<          |               |
2,1  3,=,<              |               |
3,-  HALT,_,<           |               |
3,1  3,1,<              |               |
3,-  4,-,<              |               |
4,_  4,_,<              |               v
4,1  START,_,>          |Last transition in the transition table


Transitions are set up as follows:

current state's name, character on tape to replace, next state's name, replacement character, direction to move on tape

So for example, the transition

        START,_ START,_,>
        
Says:
  1) If the current state is START
  2) And the current character the tape head is on is a _ (a space)
  3) Change state to START
  4) Replace the space with a space
  5) Move the tape head to the right
  
Transition elements can be delimited with commas or spaces (or both, as in the case of the example above).  Multiple spaces can be used as a single delimiter.  If you use commas as a delimiter, you can't have a space between the comma and the transition element.

The only hard requirements for every state transition table is the first state MUST be named START, and the halt state MUST be named HALT; other than that, states can have any name.

If you want to download this and play with it yourself, keep in mind that pre-defined programs are loaded by the page with a GET request, so they won't work on a local machine.
