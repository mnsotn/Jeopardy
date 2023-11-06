// Copyright 2019-23 Chris Bovitz, mnsotn@yahoo.com
// Credit to Jake Harrington for the idea to select cells for calculations using classes

var version = 2.2;
// cell classes: How we keep track of how clue was answered
var defaultColor = 'rgb(14,15,131)';
var classUnanswered = "clueUnanswered";
var classCorrect = "clueCorrect";
var classIncorrect = "clueIncorrect";
var classManual = "manualBet";
var classUnvisited = "clueUnvisited";
var scoreZero = "scoreUnanswered";
var scorePositive = "scoreCorrect";
var scoreNegative = "scoreIncorrect";
var clueBgClassList = [ classUnanswered, classCorrect, classIncorrect, classUnvisited ];

// "Bounding box" of clues in table
var startRowX = 2;
var numScoringRows = 5;
var startColX = 0;
var numScoringCols = 6;

// Single/double Jeopardy score tables
var defaultStartingValue = 200;
var correctCol = 0;
var incorrectCol = 1;
var totalCol = 2;
var unansweredCol = 3;
var unvisitedCol = 4;
var numContestants = 3;

// Betting limits
var minMaxBetArray = [];
var minMinBet = 5;
var minFinalBet = 0;
var tableId;
var tableNum;
var finalTableNum = 0;
var scoresTableNum = -1;
var totalCellArray = [];
var tableNameArray = [];
tableNameArray.unshift("final");

function SetTableNum()
{
	tableNum = tableNameArray.indexOf(tableId);
}

function OnClick (obj)
{
    var e = window.event.which;
	tableId = obj.id;

	SetTableNum();

    if (e == 1)  // left mouse click
        ChangeSquare (false);
    else if (e == 3)  // right mouse click
        ChangeSquare (true);
}

function RoundTitle ()
{
	var roundTitle = "Jeopardy!";
	if (tableNum != 1)  // "Single Jeopardy!" est verbotten!
		var roundTitle = tableId.charAt(0).toUpperCase() + tableId.slice(1) + " " + roundTitle;
	return roundTitle;
}

function ChangeSquare (changeBet)
{
    // Changes the color and/or value of a square, depending on what the user clicked on

    var table = document.getElementById(tableId);

    var startRow = startRowX;
    var endRow = startRow + numScoringRows;
    var startCol = startColX;
    var endCol = startCol + numScoringCols;
	var dontChangeFinal = false;

	if (((tableNum > 0) && (tableNum < tableNameArray.length)) && FinalBetSet())
	{
		alert ("Can't change answer after Final Jeopardy! bet has been made");
		dontChangeFinal = true;
	}

    if (tableNum == finalTableNum)
    {
        startRow = 1;
        endRow = startRow + 1;
        startCol = 1;
        endCol = startCol + 1;
    }

	for (var row = startRow; row < endRow; row++)
	{
		for (var col = startCol; col < endCol; col++)
		{
			var cell = table.rows[row].cells[col];

			if (changeBet)
			{
				cell.oncontextmenu =
				function ()
				{
					if (this.classList.contains(classManual))
					{
						if (confirm ("Reset to original clue value?"))
						{
							this.classList.remove(classManual);
							if (this.classList.contains("trueDouble"))
								this.classList.remove("trueDouble");

							if (tableNum == finalTableNum)
								UpdateColor(this, true);

							this.innerHTML = FormatNum (GetOrigValue (this));
							UpdateScore ();
							UpdateGame ();
						}
					}
					else if (OkToDouble(this))  // and does not have "manualBet" style
					{
						var minBet = minMinBet;

						var minMaxBet = minMaxBetArray[tableNum];

						var totalScore = parseInt (UnformatNum (document.getElementById("gameTotal").innerHTML.replace(/Total/, "0")));
						// Don't consider the value of this cell when computing max bet
						if (this.classList.contains(classCorrect))
							totalScore -= UnformatNum (this.innerHTML);
						if (this.classList.contains(classIncorrect))
							totalScore += UnformatNum (this.innerHTML);
						maxBet = totalScore < minMaxBet ? minMaxBet : totalScore;

						var betPrompt = "Enter Daily Double bet (min: "+minMinBet+", max: "+ FormatNum (maxBet) + ")";

						if (tableNum == finalTableNum)
						{
							minBet = 0;
							maxBet = totalScore;
							betPrompt = "Enter Final Jeopardy bet (min: "+FormatNum (minFinalBet)+", max: "+ FormatNum (maxBet) + ")";
						}

						if ((maxBet <= minFinalBet) && (tableNum == finalTableNum))
							alert ("Ooooh, sorry. You don't have enough money to play in Final Jeopardy.");
						else
						{
							var doubleBet = prompt (betPrompt);
							if ((doubleBet != null) && (doubleBet != "") && (doubleBet.length > 0) && (! isNaN(doubleBet)))
							{
								if ((doubleBet.match(/^\d+$/)) || (doubleBet.match(/^\d+,\d+$/)))
								{
									doubleBet = UnformatNum (doubleBet);
									if ((doubleBet < minBet) || (doubleBet > maxBet))
										alert ("Your bet must be between "+FormatNum (minBet)+" and "+ FormatNum (maxBet));
									else
									{
										UpdateAmount (this, doubleBet, (doubleBet == maxBet));
										// Don't update color if you're making a bet in this square
										UpdateScore ();
										UpdateGame ();
									}
								}
								else
									alert ("Problem with your bet: "+doubleBet);
							}
						}
					}
					else
					{
						alert ("You've used up your Daily Doubles for this round");
					}
				};
			}
			else
			{
				cell.onclick =
				function ()
				{
					if (! dontChangeFinal)
					{
						UpdateColor (this, false);
						UpdateScore ();
						UpdateGame ();
					}
				};
			}
		}
	}
}

function ClearCategoryHeader (thing)
{
    // When user clicks in category header box, clears it out

    var value = thing.value;
    if (value.match(/^category ?\d?/))
        thing.value = "";
}

function ContestantScore (goingIn, thing)
{
    var value = thing.value;
    if (goingIn)
    {
        if (value.match(/player/))
            value = "";
    }
    else
        value = FormatNum (UnformatNum (value));

    if (isNaN (UnformatNum(value)))
        value = "";

    thing.value = value;
}

function SetStartingValue ()
{
	startingValue = -defaultStartingValue;  // forces while loop to go at least once

    while ((startingValue <= 0) || (startingValue == null) || (startingValue != parseInt(startingValue)))
        startingValue = prompt("Enter top row (single) Jeopardy value", defaultStartingValue);
	startingValue = parseInt(startingValue);
	
	window.document.title = "This is "+gameName;
}

function InitRound (round)
{
    // Initializes a round

	tableId = round;

    var row;
    var col;

	if ((tableNameArray.indexOf(tableId) != 0) && (tableId != "scores"))
		tableNameArray.push(tableId);
	
	SetTableNum();
	
	minMaxBetArray[tableNum] = startingValue * 5 * tableNum;

    display = "";
    if ((tableNum > 0) && (tableNum < tableNameArray.length))
    {
		// Round header
		display += "]<table id=\""+tableId+"\" onMouseDown=\"OnClick(this);\" onContextMenu=\"OnClick(this);return false;\">\n";
        display += "]    <tr>\n";
		display += "]        <th colspan=\""+numScoringCols+"\" class=\"tableTitle\">"+RoundTitle()+"</th>\n";
		display += "]    </tr>\n";

		// Category headers
		display += "]    <tr>\n";
		for (col = 1; col <= numScoringCols; col++)
			display += "]        <th><textarea class=\"catSize\" onFocus=\"ClearCategoryHeader(this);\">category "+col+"</textarea></th>\n";
        display += "]    </tr>\n";

		// Clues
        for (row = 1; row <= numScoringRows; row++)
        {
            display += "]    <tr>\n";
            for (col = 0; col < numScoringCols; col++)
            {
				var clueValue = startingValue * tableNum * row;
				display += "]        <td class=\"orig" + clueValue.toString() + "\">"+ FormatNum(clueValue) + "</td>\n";
            }
            display += "]    </tr>\n";
        }

		// Scoring row
        display += "]    <tr>\n";
        display += "]        <td colspan=\""+numScoringCols+"\">\n";
        display += "]            <table width=\"100%\" id=\""+tableId+"Scores\">\n";
        display += "]                <tr>\n";
        display += "]                    <td class=\"score scoreCorrect\" id=\""+tableId+"Correct\">Correct</td>\n";
        display += "]                    <td class=\"score scoreIncorrect\" id=\""+tableId+"Incorrect\">Incorrect</td>\n";
        display += "]                    <td class=\"score scoreTotal\" id=\""+tableId+"Total\">Total</td>\n";
        display += "]                    <td class=\"score scoreUnanswered\" id=\""+tableId+"Unanswered\">Unanswered</td>\n";
//      display += "]                    <td class=\"score scoreUnvisited\" id=\""+tableId+"Unvisited\">Unvisited</td>\n";
        display += "]                </tr>\n";
        display += "]            </table>\n";
        display += "]        </td>\n";
        display += "]    </tr>\n";
        display += "]</table>\n";
    }
	else if (tableId == "final")
	{
		display += "]<table id=\""+tableId+"\" onMouseDown=\"OnClick(this);\" onContextMenu=\"OnClick(this); return false;\">\n";
        display += "]    <tr>\n";
        display += "]        <th colspan=\"2\" class=\"tableTitle\">\n";
        display += "]            "+RoundTitle()+"\n";
        display += "]        </th>\n";
		display += "]    </tr>\n";
        display += "]    <tr>\n";
        display += "]        <td style=\"width:50%;\"><textarea class=\"catSize\" onFocus=\"ClearCategoryHeader(this);\">category</textarea></td>\n";
        display += "]        <td id=\"finalTotal\" class=\"orig0 unvisited\">0</td>\n";
        display += "]    </tr>\n";
        display += "]</table>\n";
	}
    else if (tableId == "scores")
    {
        display += "]<div class=\"final\">\n";
        display += "]    <table id=\"total\" class=\"final\">\n";
        display += "]        <tr>\n";
        display += "]            <th class=\"big\" rowspan=\"2\">Final score:</th>\n";
        display += "]            <th class=\"big\">Actual</th>\n";
        display += "]            <th class=\"big catSizeScore\" id=\"gameTotal\">0</th>\n";
		display += "]        </tr>\n";
		display += "]        <tr>\n";
        display += "]            <th class=\"big coryat\">Coryat</th>\n";
        display += "]            <th class=\"catSizeScore coryat\" id=\"coryatTotal\">0</th>\n";
        display += "]        </tr>\n";
        display += "]    </table>\n";
        display += "]    <br/>\n";
        display += "]    <table id=\"contestant\">\n";
        display += "]        <tr>\n";
		var contestantWidth = Math.floor (100 / numContestants);
		for (var i = 1; i <= numContestants; i++)
			display += "]            <td style=\"width:"+contestantWidth+"%;\"><textarea class=\"contestantSize\" onFocus=\"ContestantScore(true,this);\" onBlur=\"ContestantScore(false,this);\">player "+i+"</textarea></td>\n";
        display += "]        </tr>\n";
        display += "]    </table>\n";
        display += "]</div>\n";
    }

	display += "]\n";
	display += "]<br/>\n\n";
	
	display = display.replace(/]/g, "        ");
	document.write (display);

}

function OkToDouble (thing)
{
    // Determines if it's okay to make this cell a daily double

    if (tableNum == finalTableNum)
        return true;

    var startRow = startRowX;
    var endRow = startRow + numScoringRows;
    var startCol = startColX;
    var endCol = startCol + numScoringCols;

    var maxDoubles = tableNum;

    var doubles = 0;

    var table = document.getElementById (tableId);

    var doublesList = table.getElementsByClassName (classManual);
    for (var i = 0; i < doublesList.length; i++)
    {
        if (doublesList[i] == thing)
            break;
    }

    if ((doublesList.length == maxDoubles) && (i == doublesList.length))
        return false;

    return true;
}

function FormatNum (x)
{
    // Makes a number look nice

    return x.toLocaleString("en");
}

function UnformatNum (x)
{
    // Returns a raw number, sans formatting

    return parseInt (x.replace(/\,/g, "").replace(/^\$/g, ""));
}

function UpdateAmount (cell, amount, trueDouble)
{
    // Changes the clue amount

    if (typeof (amount) == "string")
        amount = parseInt (amount);
    cell.innerHTML = FormatNum (amount);
    cell.classList.add(classManual);
	if (trueDouble)
		cell.classList.add("trueDouble");
}

function UpdateColor (cell, reset)
{
    // Changes the clue color
	var newClass;

    for (var i = 0; i < cell.classList.length; i++)
    {
        if (cell.classList[i].match(/^clue/))
            break;
    }
    var currClass = cell.classList[i];
    var currIndex = clueBgClassList.indexOf(currClass);
    var newIndex = (currIndex + 1) % clueBgClassList.length;
	if (reset)
		newClass = clueBgClassList[-1];
	else
		newClass = clueBgClassList[newIndex];

    cell.classList.remove(currClass);
    cell.classList.add(newClass);
}

function UpdateScore ()
{
    // Updates the scores

    var correctTotal = 0;
    var incorrectTotal = 0;
    var unansweredTotal = 0;
	var doublesAdjustment = 0;
    // var unvisitedTotal = 0;
    var roundTotal;

    var table = document.getElementById(tableId);
    var scoresId = tableId + "Scores";
    var scores = document.getElementById(scoresId);

    var startRow = startRowX;
    var endRow = startRow + numScoringRows;
    var startCol = startColX;
    var endCol = startCol + numScoringCols;

    if (tableNum == finalTableNum)
    {
        endRow = startRow + 1;
        startCol = 1;
        endCol = startCol + 1;
    }

    var correctList = table.getElementsByClassName(classCorrect);
    for (var i = 0; i < correctList.length; i++)
        correctTotal += parseInt (UnformatNum (correctList[i].innerHTML));

    var incorrectList = table.getElementsByClassName(classIncorrect);
    for (var i = 0; i < incorrectList.length; i++)
        incorrectTotal += parseInt (UnformatNum (incorrectList[i].innerHTML));

    var unansweredList = table.getElementsByClassName(classUnanswered);
    for (var i = 0; i < unansweredList.length; i++)
        unansweredTotal += parseInt (UnformatNum (unansweredList[i].innerHTML));

    // var unvisitedList = table.getElementsByClassName(classUnvisited);
    // for (var i = 0; i < unvisitedList.length; i++)
    //     unvisitedTotal += parseInt (UnformatNum (unvisitedList[i].innerHTML));

    roundTotal = correctTotal - incorrectTotal;

    if ((tableNum > 0) && (tableNum <= tableNameArray.length))
    {
        var correctCell = scores.rows[0].cells[correctCol];
        var incorrectCell = scores.rows[0].cells[incorrectCol];
        var totalCell = scores.rows[0].cells[totalCol];
        var unansweredCell = scores.rows[0].cells[unansweredCol];
        // var unvisitedCell = scores.rows[0].cells[unvisitedCol];

        // Update scores
        correctCell.innerHTML = FormatNum (correctTotal);
        if (correctTotal)
            correctCell.innerHTML = "+" + FormatNum (correctTotal);

        incorrectCell.innerHTML = FormatNum (incorrectTotal);
        if (incorrectTotal)
            incorrectCell.innerHTML = "-" + FormatNum (incorrectTotal);

        totalCell.innerHTML = FormatNum (roundTotal);
        if (roundTotal > 0)
            totalCell.innerHTML = "+" + totalCell.innerHTML;

        unansweredCell.innerHTML = FormatNum (unansweredTotal);
        // unvisitedCell.innerHTML = FormatNum (unvisitedTotal);  
    }
}

function UpdateGame ()
{
    // Updates the game totals

	var doublesAdjustment = 0;
	var i;
	var sign;

	var gameTotal = 0;

	for (i = tableNameArray.length-1; i >=0 ; i--)
	{
		var roundTotalCell = document.getElementById(tableNameArray[i]+"Total");
		var roundTotal = UnformatNum (roundTotalCell.innerHTML);
		if (isNaN (roundTotal))
			roundTotal = 0;
		gameTotal += roundTotal;

		if (tableNameArray[i] == "final")  // adjustments for final round
		{
			if (roundTotalCell.classList.contains(classIncorrect))
				gameTotal -= 2 * roundTotal;
			else if (! roundTotalCell.classList.contains(classCorrect))
				gameTotal -= roundTotal;
		}
	}

	gameTotalCell = document.getElementById("gameTotal");
	sign = gameTotal > 0 ? "+" : "";
    gameTotalCell.innerHTML = sign + FormatNum (gameTotal);

	// Color the score appropriately
    for (i = 0; i < gameTotalCell.classList.length; i++)
    {
        if (gameTotalCell.classList[i].match(/^score/))
            gameTotalCell.classList.remove(gameTotalCell.classList[i]);
	}
	if (gameTotal > 0)
		gameTotalCell.classList.add(scorePositive);
	else if (gameTotal < 0)
		gameTotalCell.classList.add(scoreNegative);
	else
		gameTotalCell.classList.add(scoreZero);

	// Calculate Coryat score
	var manualBetList = document.getElementsByClassName(classManual);
	for (i = 0; i < manualBetList.length; i++)
	{
		if (manualBetList[i].classList.contains(classIncorrect))
			doublesAdjustment -= parseInt (UnformatNum (manualBetList[i].innerHTML));
	}
	coryatTotal = gameTotal - doublesAdjustment;

	var coryatTotalCell = document.getElementById("coryatTotal");
	sign = coryatTotal > 0 ? "+" : "";
    coryatTotalCell.innerHTML = sign + FormatNum (coryatTotal);

	// Color the score appropriately
    for (i = 0; i < coryatTotalCell.classList.length; i++)
    {
        if (coryatTotalCell.classList[i].match(/^score/))
            coryatTotalCell.classList.remove(coryatTotalCell.classList[i]);
	}
	if (coryatTotal > 0)
		coryatTotalCell.classList.add(scorePositive);
	else if (coryatTotal < 0)
		coryatTotalCell.classList.add(scoreNegative);
	else
		coryatTotalCell.classList.add(scoreZero);
}

function FinalBetSet ()
{
	return document.getElementById("finalTotal").classList.contains(classManual)
}

function GetOrigValue (clue)
{
	var i;

	for (i = 0; i < clue.classList.length; i++)
	{
		if (clue.classList[i].indexOf(/orig/))
			break;
	}

	if (i < clue.classList.length)
	{
		var origValueClass = clue.classList[i];
		var num = UnformatNum (clue.classList[i].replace("orig", ""));
		
		return num;
	}

	return -1;
}