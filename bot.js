function pointsToObject(points) {
    let newState = {}
    for (let [key, value] of points.entries()) {
        newState[key] = Object.assign({}, value)
    }
    return newState
}

class Combinatorics {
    constructor() { }

    _insertAt(val, pos, arr) {
        let result = [...arr]
        for (var i = result.length; i > pos; i--) {
            result[i] = result[i - 1]
        }

        result[pos] = val
        return result
    }

    permutations(arr) {
        if (arr.length <= 1) return arr
        let permutations = []
        let [first, ...rest] = arr

        if (rest.length == 1) {
            let [last] = rest
            return [[first, last], [last, first]]
        }

        let restPermutations = getPerumutations(rest)

        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < restPermutations.length; j++) {
                let permutation = this._insertAt(first, i, restPermutations[j])
                permutations = [...permutations, permutation]
            }
        }

        return permutations
    }
    combinations(arr, k) {

        let combinations = []

        if (arr.length == 0 || k == 0) {
            return []
        }

        if (k == 1) {
            return arr.map(element => [element])
        }

        for (let i = 0; i < arr.length; i++) {
            let first = arr[i]
            let rest = arr.slice(i + 1)
            let restCombinations = getCombinations(rest, k - 1)
            for (let j = 0; j < restCombinations.length; j++) {
                let combination = this._insertAt(first, 0, restCombinations[j])
                combinations = [...combinations, combination]
            }
        }

        return combinations
    }

    cartesian(arr1, arr2) {
        let cartesianArr = []
        for (let i = 0; i < arr1.length; i++) {
            for (let j = 0; j < arr2.length; j++) {
                let pair = [arr1[i], arr2[j]]
                cartesianArr = [...cartesianArr, pair]
            }
        }

        return cartesianArr
    }
}




class Tree {
    constructor() {
        this.data = {}
        this.children = []
        this.parent = null
    }

    setData(data) {
        this.data = data
    }
    getData() {
        return this.data
    }

    setChildren(children) {
        this.children = children
    }
    getChildren() {
        return this.children
    }
    addChild(child) {
        this.children.push(child)
    }
    setParent(parent) {
        this.parent = parent
    }
    getParent() {
        return this.parent
    }

    getLeaves() {
        let leaves = []
        if (this.children.length == 0) {
            return [this]
        }
        else {
            for (let child of this.children) {
                leaves = [...leaves, ...child.getLeaves()]

            }
        }
        return leaves
    }

    toString() {
        return Object.assign({}, pointsToObject(this.getData().board.points), {
            moves: this.getData().moves,
            roll: this.getData().board.roll
        })
    }


}





class Bot {
    constructor(combo, backgammon, config) {
        this.combo = combo
        this.backgammon = backgammon
        this.config = config || {
            blockades: 1.3,
            blots: 1.3,
            bar: {
                me: 1.3,
                opponent: 1.3
            },
            chambers: {
                first: 1.1,
                second: 1.3,
                third: 1.5,
                fourth: 1.7
            }
        }
    }

    getChamber(n, player) {
        let chambers = {
            first: range(1, 7),
            second: range(7, 13),
            third: range(13, 19),
            fourth: range(19, 25)
        }

        let correspondingChamber = Object.keys(chambers).find(chamber => {
            if (player == Black) {
                chambers[chamber] = chambers[chamber].map(position => 25 - position)
            }

            return chambers[chamber].includes(n)
        })

        return correspondingChamber
    }

    rate(board, moves) {
        let config = this.config
        let countBlockades = 0
        let countBlots = 0
        let rateBlockades = 0

        let rateBar = board.bar[backgammon.getOpponent(board.turn)] * config.bar.opponent - board.bar[board.turn] * config.bar.me

        for (let [n, point] of board.points.entries()) {

            if (board.turn == point.player && point.count > 1) {
                countBlockades += 1
                rateBlockades = config.chambers[this.getChamber(n, board.turn)]
                countBlockades *= rateBlockades

            }

            if (board.turn == point.player && point.count == 1) {
                countBlots++
            }
        }

        let race = this.countPips(board)
        return 167 - race + rateBar + countBlockades * config.blockades - countBlots * config.blots
    }

    filterSameScreenshot(screenshots) {

    }
    countPips(board) {
        let { turn, points } = board
        let race = 0
        const transformRaceIndex = (player, index) => (player == 'W') ? 25 - index : index

        for (let [n, point] of points.entries()) {
            if (point.player == turn) {
                let raceIndex = transformRaceIndex(turn, n)
                race += point.count * raceIndex
            }
        }
        return race
    }

    getBestMove(screenshots) {
        console.log(screenshots)
        let ratedScreenshots = screenshots.map(screenshot => ({
            moves: screenshot.moves,
            score: this.rate(screenshot.board, screenshot.moves)
        }))

        let sorted = ratedScreenshots.sort((ratedScreenshot1, ratedScreenshot2) => {
            if (ratedScreenshot1.score == ratedScreenshot2.score) {
                return 0
            }
            if (ratedScreenshot1.score < ratedScreenshot2.score) {
                return -1
            }

            if (ratedScreenshot1.score > ratedScreenshot2.score) {
                return 1
            }
        })

        let bestMove = sorted[sorted.length - 1]
        console.log(bestMove)
        bestMove = bestMove.moves.map(m => m)

        return bestMove
    }
    getPlayerPositions(player, state) {
        // check if player has checker on the bar
        let positions = []
        let { bar, points } = state

        if (bar[player] !== 0) {
            positions.push((player == White) ? 0 : 25)
        }

        for (let [position, point] of points.entries()) {
            if (point.player == player) {
                positions.push(position)
            }
        }

        return positions
    }

    mapPairToMove(pair) {
        let [dice, position] = pair
        return {
            dice,
            position
        }
    }

    getMoves(positions = [], state, parentMove) {
        let combo = this.combo
        let backgammon = this.backgammon
        let { roll } = state

        if (roll.length == 0) {
            return []
        }

        let allMovesPerDice = roll.map(dice => combo.cartesian([dice], positions).map(this.mapPairToMove))
        let validMovesPerDice = allMovesPerDice.map(moves => moves.filter(move => backgammon.isValidMove(move, state)))
        let allStartingMoves = validMovesPerDice.reduce((moves, move) => [...moves, ...move], [])
        return allStartingMoves.map(move => {
            let board = backgammon.moveVirtual(move, state)
            let tree = new Tree()
            let previousMoves = []
            if (parentMove !== null) {
                previousMoves = [...parentMove.getData().moves]
            }
            tree.setData({
                moves: previousMoves.concat(move),
                board
            })
            if (parentMove !== null) {
                tree.setParent(parentMove)
            }
            tree.setChildren(this.getMoves(this.getPlayerPositions(board.turn, board), board, tree))
            return tree
        })
    }

    play(state) {
        // Should return a valid move 
        let { turn, roll, points } = state
        let positions = this.getPlayerPositions(turn, state)
        let moves = this.getMoves(positions, state, null)
        let screenshots = moves.reduce((allMoves, tree) => [...allMoves, ...tree.getLeaves().map(t => t.getData())], [])
        // let allPossibleMoves = moves.reduce((allMoves, tree) => [...allMoves, ...tree.getLeaves().map(t => t.getData().moves)], [])

        // let randMove = allPossibleMoves[Math.floor(Math.random() * allPossibleMoves.length)]

        return this.getBestMove(screenshots)
    }
}