const White = 'W'
const Black = 'B'
const CPU = 'W'

const rand = (from, to) => Math.floor(Math.random() * to + from)
const range = (from, to, accending = true) => {
    if (accending === true) {
        return Array.from(new Array(to - from), (_, i) => i + from)
    }

    return Array.from(new Array(from - to), (_, i) => from - i)
}

const distinct = (arr) => [...new Set(arr)]
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const ON_CHECKER_SELECTED = 'ON_CHECKER_SELECTED'
const ON_CHECKER_MOVED = 'ON_CHECKER_MOVED'
const ON_ROLL_STARTED = 'ON_ROLL_STARTED'
const ON_ROLL_END = 'ON_ROLL_END'
const ON_BAR_CHECKER_SELECTED = 'ON_BAR_CHECKER_SELECTED'

class Backgammon {

    constructor($points) {
        this.$points = $points
        this.$roll = null


    }

    sortPoints() {
        let originalOrder = [...range(18, 12, false), ...range(12, 6, false), ...range(24, 24 - 6, false), ...range(6, 0, false)]
        let $pointsArr = [...this.$points]

        $pointsArr.forEach(($point, i) => $point.setAttribute('id', 'point-' + originalOrder[i]))

    }
    init() {
        this.sortPoints()
        let points = new Map()
        points.set(1, { player: White, count: 2 })
        points.set(6, { player: Black, count: 5 })
        points.set(8, { player: Black, count: 3 })
        points.set(12, { player: White, count: 5 })
        points.set(13, { player: Black, count: 5 })
        points.set(17, { player: White, count: 3 })
        points.set(19, { player: White, count: 5 })
        points.set(24, { player: Black, count: 2 })

        this.state = {
            turn: Black,
            roll: [],
            bar: {
                W: 0,
                B: 0
            },
            bearoff: {
                W: 0,
                B: 0
            },
            points: points,
            marks: []
        }

        this.bindRollElement()

        this.draw()
    }

    bindRollElement() {
        this.$roll = document.querySelector('.roll.' + this.state.turn)
        this.$roll.querySelector('.roll-button').onclick = this.update.bind(this, {
            type: ON_ROLL_STARTED,
            payload: {
                rollElement: this.$roll
            }
        })

        if (this.state.turn == CPU) {
            wait(500).then(_ => this.$roll.querySelector('.roll-button').click())
        }

    }

    update(action) {

        let { turn, roll, points } = this.state

        switch (action.type) {
            case ON_BAR_CHECKER_SELECTED:
                let { barIndex } = action.payload
                let allMarks = roll.map(dice => {
                    let move = {
                        dice: dice,
                        position: barIndex
                    }

                    let isValid = this.isValidMove(move, this.state)

                    if (isValid) {
                        let mark = {
                            dice: dice,
                            position: barIndex,
                            toPosition: this.jumpIndex(dice, barIndex, turn)
                        }

                        return mark
                    } else {
                        return false
                    }

                }).filter(mark => mark !== false)

                this.state.marks = allMarks
                this.draw()
                break;
            case ON_CHECKER_SELECTED:

                let { pointIndex } = action.payload
                let marks = roll.map(dice => {
                    let move = {
                        dice: dice,
                        position: pointIndex
                    }

                    let isValid = this.isValidMove(move, this.state)

                    if (isValid) {
                        let mark = {
                            dice: dice,
                            position: pointIndex,
                            toPosition: this.jumpIndex(dice, pointIndex, turn)
                        }

                        return mark
                    } else {
                        return false
                    }

                }).filter(mark => mark !== false)

                this.state.marks = marks
                this.draw()
                break;
            case ON_CHECKER_MOVED:

                let { move } = action.payload
                this.state.marks = []
                let state = this.moveVirtual(move, this.state)
                this.state = state
                if (this.state.roll.length == 0 || !this.isThereAMove()) {
                    this.changeTurn()
                }
                document.querySelector('.dice.' + this.getDiceClassFromDiceNum(move.dice)).remove()
                this.draw()
                break;
            case ON_ROLL_STARTED:

                let rollElement = action.payload.rollElement
                rollElement.querySelector('.roll-button').classList.remove('active')
                rollElement.querySelector('.dices').classList.add('active')
                let $dices = rollElement.querySelector('.dices')

                let motionRoll = []

                const rollId = setInterval(() => {
                    motionRoll = [Math.floor(Math.random() * 6 + 1), Math.floor(Math.random() * 6 + 1)]
                    // motionRoll = [4, 4]
                    if (motionRoll[0] == motionRoll[1]) {
                        motionRoll = range(0, 4).map(n => motionRoll[0])
                    }
                    $dices.innerHTML = motionRoll.map(num => this.getDiceElement(num)).join('')

                }, 100)
                let randRollingTime = range(403, 701)
                randRollingTime = randRollingTime[Math.floor(Math.random() * randRollingTime.length)]

                let whenRollingCompletes = wait(randRollingTime).then(_ => {
                    clearInterval(rollId)
                    this.state.roll = motionRoll

                    if (!this.isThereAMove()) {
                        console.log('Move does not exist')
                        wait(1000)
                            .then(lorem => {
                                this.changeTurn()
                                this.draw()
                            })
                    }
                    else {
                        this.draw()
                    }

                    return Promise.resolve(1)
                })

                if (this.state.turn != CPU) {
                    break;
                }

                whenRollingCompletes.then(_ => wait(1).then(a => {
                    let moves = cpu.play(this.state)

                    if (moves == undefined) {
                        return;
                    }
                    let batchId = setInterval(() => {

                        this.update.call(this, {
                            type: ON_CHECKER_MOVED,
                            payload: {
                                move: moves.shift()
                            }
                        })
                        if (moves.length == 0) {
                            clearInterval(batchId)
                        }
                    }, 1000)
                }))

                break;
            default:
                return;
        }


        // this.evaluate()
        // this.changeTurn()
        // this.draw()
    }

    changeTurn() {
        let oppositeRoll = this.oppositeTurn(this.state.turn)
        this.state.turn = oppositeRoll
        this.state.roll = []
        this.bindRollElement()
    }

    oppositeTurn(turn) {
        return (turn == 'W') ? 'B' : 'W'
    }

    draw() {
        let { points, bar, marks, roll } = this.state
        this.drawBar(bar)

        for (let n of range(1, 25)) {
            let point = points.get(n)
            let pointElement = this.getPoint(n)
            let mark = marks.find(m => m.toPosition == n)

            if (mark !== undefined) {
                this.addMark(pointElement, mark)
            }
            else {
                this.removeMark(pointElement)
                pointElement = this.getPoint(n)
            }

            if (point !== undefined) {

                this.drawCheckers(point.player, point.count, pointElement.querySelector('.checkers'), n)
            }
            else {
                this.invalidatePoint(pointElement.querySelector('.checkers'))
            }
        }

        if (roll.length == 0) {
            this.showCorresponingRollPanel()

        }
    }

    invalidatePoint(element) {
        element.innerHTML = ""
    }
    invalidateBar(element) {
        element.innerHTML = ""
    }



    getOpponent(player) {
        return (player === White) ? Black : White
    }
    showCorresponingRollPanel() {
        let $homeRoll = document.querySelector('.roll.' + this.state.turn)
        let $opponentRoll = document.querySelector('.roll.' + this.getOpponent(this.state.turn))

        $homeRoll.querySelector('.roll-button').classList.add('active')
        $homeRoll.querySelector('.dices').classList.remove('active')

        $opponentRoll.querySelector('.roll-button').classList.remove('active')
        $opponentRoll.querySelector('.dices').classList.remove('active')

    }
    addMark(pointElement, mark) {

        pointElement.classList.add('active')
        pointElement.addEventListener('click', backgammon.update.bind(this, {
            type: ON_CHECKER_MOVED,
            payload: {
                move: {
                    dice: mark.dice,
                    position: mark.position
                },
                to: mark.toPosition
            }
        }))
    }

    removeMark(pointElement) {
        let newPointElement = this.createPointElement(pointElement.id, pointElement.innerHTML)
        pointElement.parentElement.replaceChild(newPointElement, pointElement)
    }

    drawCheckers(player, count, element, pointIndex) {

        let checkers = range(0, count).map((_, i) => this.createCheckerElement(player, this.state, i, count == i + 1, pointIndex))

        element.innerHTML = ""
        for (let checker of checkers) {
            element.appendChild(checker)
        }



    }

    createBarCheckerElement(player, state, i, isLast) {

        let checker = document.createElement('div')
        checker.classList.add('bar-checker')

        if (isLast && state.turn == player) {
            checker.onclick = this.update.bind(this, {
                type: ON_BAR_CHECKER_SELECTED,
                payload: {
                    barIndex: this.getBarIndex(player)
                }
            })
        }

        return checker
    }

    drawBarCheckers(player, count, element) {
        let checkers = range(0, count).map((_, i) => this.createBarCheckerElement(player, this.state, i, count == i + 1))

        element.innerHTML = ""
        for (let checker of checkers) {
            element.appendChild(checker)
        }
    }

    drawBar(bar) {
        let { W, B } = bar

        let whiteBarElement = document.querySelector('.bar-' + White)
        let blackBarElement = document.querySelector('.bar-' + Black)

        if (W > 0) {
            this.drawBarCheckers(White, W, whiteBarElement)
        }
        else {
            this.invalidateBar(whiteBarElement)
        }
        if (B > 0) {
            this.drawBarCheckers(Black, B, blackBarElement)
        }
        else {
            this.invalidateBar(blackBarElement)
        }

    }

    getDiceClassFromDiceNum(num) {
        let classMap = new Map()
        classMap.set(1, 'one')
        classMap.set(2, 'two')
        classMap.set(3, 'three')
        classMap.set(4, 'four')
        classMap.set(5, 'five')
        classMap.set(6, 'six')
        return classMap.get(num)
    }
    getDiceElement(num) {
        let template = `
        <div class="dice ${this.getDiceClassFromDiceNum(num)}">
            ${'<div class="dot"></div>'.repeat(num)}
        </div>`

        return template
    }

    createPointElement(id, innerContent) {
        let point = document.createElement('div')
        point.classList.add('point')
        point.id = id
        point.innerHTML = innerContent
        return point
    }
    createCheckerElement(player, state, i, isLast, pointIndex) {

        let checker = document.createElement('div')
        checker.classList.add('checker')
        checker.classList.add(player)
        checker.setAttribute('style', `bottom: ${i * 45}px`)

        if (isLast && state.turn == player) {
            checker.onclick = this.update.bind(this, {
                type: ON_CHECKER_SELECTED,
                payload: {
                    pointIndex
                }
            })
        }

        return checker
    }
    evaluate() {
    }

    getPoint(n) {
        return document.getElementById('point-' + n)
    }


    jumpIndex(dice, position, player) {

        if (player == White) {
            return position + dice
        }
        else if (player == Black) {
            return position - dice
        }
    }

    // isValidMove(move = { dice: -1, position: -1 }, virtualState = Object.assign({}, this.state)) {

    //     return true;
    // }

    // moveVirtual(oldState) {
    //     let newState = oldState
    //     return newState
    // }

    cloneState(state) {
        let newState = Object.assign({}, state, {
            roll: state.roll.map(dice => dice),
            bar: Object.assign({}, state.bar),
            bearoff: Object.assign({}, state.bearoff),
            points: this.cloneMap(state.points),
            marks: state.marks.map(mark => Object.assign({}, mark))

        })

        return newState
    }

    cloneMap(oldMap = new Map()) {
        let newMap = new Map()
        for (let [key, value] of oldMap.entries()) {

            newMap.set(key, Object.assign({}, value))
        }
        return newMap
    }
    move() {

    }

    isThereAMove() {
        let { turn, roll, bar, points } = this.state

        if (bar[turn] > 0) {
            // Player must have a valid move from the bar
            let moves = roll.map(dice => ({
                dice: dice,
                position: this.getBarIndex(turn)
            }))

            let isThereValidMove = moves.some(move => this.isValidMove(move, this.state))

            if (isThereValidMove) {
                return true
            }

            return false
        }

        for (let [n, point] of points.entries()) {

            if (point.player !== turn) {
                continue
            }

            let moves = roll.map(dice => ({
                dice: dice,
                position: n
            }))

            let isThereValidMove = moves.some(move => this.isValidMove(move, this.state))

            if (isThereValidMove) {
                return true
            }

        }

        return false
    }

    moveVirtual(move, oldState) {
        let newState = this.cloneState(oldState)
        if (oldState.roll.length == 0) {
            return newState
        }



        let { turn, bar, points } = newState

        if (move.position == 0 || move.position == 25) {
            // this move is from the bar
            let start = {
                position: this.getBarIndex(turn),
                barCount: bar[turn]
            }
            let end = {}
            end.position = this.jumpIndex(move.dice, start.position, turn)
            end.point = points.get(end.position)

            // We decrement the checkers count from the bar position
            start.barCount -= 1

            // check if there are 0 checkers at the ending position, if so, just poppulate the corresponding point with the current turn and add 1 checker
            if (end.point == undefined) {
                points.set(end.position, {
                    player: turn,
                    count: 1
                })
            }
            else if (end.point) {

                if (end.point.player == this.getOpponent(turn)) {
                    points.set(end.position, {
                        player: turn,
                        count: 1
                    })

                    bar[this.getOpponent(turn)] += 1
                }

                if (end.point.player == turn) {
                    points.set(end.position, {
                        player: turn,
                        count: end.point.count + 1
                    })
                }
            }

            newState.bar = Object.assign({}, bar, {
                [turn]: start.barCount
            })

            newState.points = points
            newState.roll.splice(newState.roll.findIndex(dice => dice == move.dice), 1)

            return newState

        }

        let start = {
            position: move.position,
            point: points.get(move.position)
        }

        let end = {}
        end.position = this.jumpIndex(move.dice, start.position, turn)
        end.point = points.get(end.position)

        // We decrement the checkers count from the starting position
        start.point.count -= 1

        // check if there are 0 checkers at this point , if so, remove the point from the points Map
        if (start.point.count == 0) {
            points.delete(start.position)
        }

        // check if there are 0 checkers at the ending position, if so, just poppulate the corresponding point with the current turn and add 1 checker
        if (end.point == undefined) {
            points.set(end.position, {
                player: turn,
                count: 1
            })
        }
        else if (end.point) {

            if (end.point.player == this.getOpponent(turn)) {
                points.set(end.position, {
                    player: turn,
                    count: 1
                })

                bar[this.getOpponent(turn)] += 1
            }
            if (end.point.player == turn) {
                points.set(end.position, {
                    player: turn,
                    count: end.point.count + 1
                })
            }
        }

        newState.bar = bar
        newState.points = points
        newState.roll.splice(newState.roll.findIndex(dice => dice == move.dice), 1)

        return newState
    }

    getBarIndex(player) {
        return (player == White) ? 0 : 25
    }

    BAR_RULE_PlayerShouldHaveCheckerOnBar(bar, player) {

        if (bar[player] > 0) {
            return true
        }

        return false
    }

    BAR_RULE_PlayerShouldJumpOnlyOnEmptyOrOwningOrOneOpponentCheckerPoint(dice, position, player, state) {
        let pointIndex = this.jumpIndex(dice, position, player)

        let point = state.points.get(pointIndex)

        if (point == undefined) {
            return true
        }

        if (point.count == 1) {
            return true
        }

        if (point.player == player) {
            return true;
        }

        if (point.count > 1 && point.player == this.getOpponent(player)) {
            return false
        }

    }

    isValidMove(move, state) {
        let { turn, bar, bearoff, points } = state
        let { dice, position } = move
        let rules = []
        let isValid = false
        // check if player is in a bearing off position : if so, other rules apply
        // check if player has a checker on the bar: if so, it is pretty trivial to filter just bar starting moves
        if (bar[turn] > 0) {

            if (move.position !== this.getBarIndex(turn)) {
                return isValid
            }

            rules = [
                this.BAR_RULE_PlayerShouldHaveCheckerOnBar(bar, turn),
                this.BAR_RULE_PlayerShouldJumpOnlyOnEmptyOrOwningOrOneOpponentCheckerPoint(dice, position, turn, this.state)
            ]

            isValid = rules.every(rule => rule)
            return isValid
        }
        // check regular valid move


        let point = state.points.get(position)
        rules = [
            this.playerShouldHaveCheckerOnMovingPoint(point, turn),
            this.playerShouldJumpOnlyOnEmptyOrOwningOrOneOpponentCheckerPoint(dice, position, turn, state),
            this.playerShouldNotJumpOutOfBoundaries(dice, position, turn)
        ]

        isValid = rules.every(rule => rule)

        return isValid
    }

    playerShouldHaveCheckerOnMovingPoint(point, player) {

        if (point == undefined) {
            return false
        }

        if (point.count > 0 && point.player == player) {
            return true
        }
        return false
    }

    playerShouldJumpOnlyOnEmptyOrOwningOrOneOpponentCheckerPoint(dice, position, player, state) {
        let pointIndex = this.jumpIndex(dice, position, player)

        let point = state.points.get(pointIndex)

        if (point == undefined) {
            return true
        }
        if (point.count == 1) {
            return true
        }
        if (point.count > 1 && point.player == this.getOpponent(player)) {
            return false
        }

        if (point.player == player) {
            return true;
        }
    }

    playerShouldNotJumpOutOfBoundaries(dice, position, player) {
        let endIndex = this.jumpIndex(dice, position, player)

        if (endIndex > 24 || endIndex < 1) {
            return false
        }
        return true
    }

}



