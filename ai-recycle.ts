/* TO DO LIST
 * Picture based "thinking" and "error" states - thought bubbles for robot
 */

//% weight=100
//% color=#7F7A7A
// % icon="\uf544" - TODO robot icon not working
//% block="Recycle AI"
namespace ai_recycle {
    const CLASSIFICATION_STEPS = 10;
    const RECYCLABLES_TO_SORT = 5;
    const ROBOT_SPEED = 50;
    const ROBOT_CARRY_SPEED = 30;

    class BinSprite extends Sprite {
        classification: classification;
    }

    class RecycleSprite extends Sprite {
        itemType: itemType;
    }

    interface RobotState {
        targetItem?: RecycleSprite;
        itemInHand?: RecycleSprite;
        targetBin?: BinSprite;
    }

    type itemType = "sodaCan" | "note" | "waterBottle";
    type classification = "metal" | "paper" | "plastic";

    let robotSprite: Sprite = null
    let sampleCount = 0
    let recycleOptions: itemType[] = []
    let sampleType: itemType;
    let sampleSprite: Sprite = null;
    let classificationBuckets: { [key: string]: string[] } = {};    
    let plasticBin: BinSprite = null;
    let paperBin: BinSprite = null;
    let metalBin: BinSprite = null;
    let recyclableItems: RecycleSprite[] = [];
    let userAgentCode: () => void = null;
    let expectedItemMapping: { [key: string]: classification } = {
        ["sodaCan"]: "metal",
        ["note"]: "paper",
        ["waterBottle"]: "plastic"
    };
    let robotState: RobotState = {};


    /**
     * Defines behavior for our robot
     */
    //% block="On RecycleBot run"
    export function onAgentRun(handler: () => void) {
        userAgentCode = handler;
        refreshRecycleOptions();
        runTraining();
    }

    /**
     * Checks if there are any recyclables in the area
     */
    //% block="Recyclables in area"
    export function recyclablesExist(): boolean {
        return recyclableItems.length > 0;
    }

    /**
     * Tells the RecycleBot to go to the nearest trash
     */
    //% block="Pick up recyclable item"
    export function goToItem(): void {
        if (!recyclableItems.length) {
            robotSprite.sayText("I can't find any more trash!");
            return;
        }

        robotState.targetItem = recyclableItems[0];
        let targetDistanceSqrd = (robotSprite.x - robotState.targetItem.x) ** 2 + (robotSprite.y - robotState.targetItem.y)**2;
        for (let item of recyclableItems) {
            const distanceSqrd = (robotSprite.x - item.x)**2 + (robotSprite.y - item.y)**2;
            if (distanceSqrd < targetDistanceSqrd) {
                robotState.targetItem = item;
                targetDistanceSqrd = distanceSqrd;
            }
        }

        robotSprite.follow(robotState.targetItem, ROBOT_SPEED);
        sprites.onOverlap(SpriteKind.Player, SpriteKind.Food, (player, item) => {
            if (item !== robotState.targetItem) {
                return;
            }
            robotState.itemInHand = robotState.targetItem;
            robotState.itemInHand.follow(robotSprite, ROBOT_CARRY_SPEED);
        });

        pauseUntil(() => !!robotState.itemInHand);

        sprites.onOverlap(SpriteKind.Food, SpriteKind.Food, (player, item) => { });
    }

    /**
     * Sorts the recyclable based on the classification data you input
     */
    //% block="Classify item in hand"
    export function classifyItem(): void {

        if (!robotState.itemInHand) {
            robotSprite.sayText("I don't have an item to classify yet!");
        }

        let chosenClassification = classificationBuckets[robotState.itemInHand.itemType]._pickRandom();
        if (chosenClassification === "paper") {
            robotState.targetBin = paperBin;
        } else if (chosenClassification === "plastic") {
            robotState.targetBin = plasticBin;
        } else {
            robotState.targetBin = metalBin;
        }
    }

    /**
     * Goes to the bin based on the classification the robot selected
     */
    //% block="Put item in chosen bin"
    export function goToBin(): void {
        if (!robotState.targetBin) {
            robotSprite.sayText("I need to classify this before I can go to a bin!")
            return;
        }

        let hasReachedBin = false;
        sprites.onOverlap(SpriteKind.Food, SpriteKind.Enemy, (item, bin) => {
            if (bin !== robotState.targetBin) {
                return;
            }
            hasReachedBin = true;
        });

        robotSprite.follow(robotState.targetBin, ROBOT_CARRY_SPEED);

        pauseUntil(() => hasReachedBin);

        if (expectedItemMapping[robotState.itemInHand.itemType] === robotState.targetBin.classification) {
            info.changeScoreBy(1);
        }

        sprites.destroy(robotState.itemInHand);
        recyclableItems.removeElement(robotState.itemInHand);

        if (!recyclableItems.length) {
            game.gameOver(info.score() === RECYCLABLES_TO_SORT);
        }

        robotState = {};
    }

    function refreshRecycleOptions() {
        recycleOptions = ["sodaCan", "note", "waterBottle"]
    }

    function classifySample(choice: string) {
        if (!(classificationBuckets[sampleType])) {
            classificationBuckets[sampleType] = []
        }
        classificationBuckets[sampleType].push(choice)
        sprites.destroy(sampleSprite)
        sampleCount += 1
        if (sampleCount < CLASSIFICATION_STEPS) {
            showTrainingOption()
        } else {
            runTrial()
        }
    }

    function runTraining() {
        showTrainingOption()
    }

    function showTrainingOption() {
        scene.setBackgroundImage(assets.image`trainingBackground`);
        sampleType = recycleOptions._pickRandom()
        recycleOptions.removeElement(sampleType);
        if (recycleOptions.length == 0) {
            refreshRecycleOptions();
        }
        if (sampleType == "sodaCan") {
            sampleSprite = sprites.create(assets.image`sodaCan`, SpriteKind.Food)
        } else if (sampleType == "note") {
            sampleSprite = sprites.create(assets.image`note`, SpriteKind.Food)
        } else {
            sampleSprite = sprites.create(assets.image`waterBottle`, SpriteKind.Food)
        }
        sampleSprite.setPosition(80, 40)

        controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
            classifySample("paper")
        })
        controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
            classifySample("plastic")
        })
        controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
            classifySample("metal")
        })
    }

    function runTrial() {
        controller.left.onEvent(ControllerButtonEvent.Pressed, function () { })
        controller.right.onEvent(ControllerButtonEvent.Pressed, function () { })
        controller.up.onEvent(ControllerButtonEvent.Pressed, function () { })

        scene.setBackgroundImage(assets.image`trialBackground`);

        plasticBin = sprites.create(assets.image`plasticsBin`, SpriteKind.Enemy) as BinSprite;
        plasticBin.classification = "plastic";
        paperBin = sprites.create(assets.image`paperBin`, SpriteKind.Enemy) as BinSprite;
        paperBin.classification = "paper";
        metalBin = sprites.create(assets.image`metalBin`, SpriteKind.Enemy) as BinSprite;
        metalBin.classification = "metal";

        plasticBin.setPosition(30, 100);
        paperBin.setPosition(scene.screenWidth() / 2, 100);
        metalBin.setPosition(scene.screenWidth() - 30, 100);

        robotSprite = sprites.create(assets.image`robotLeft`, SpriteKind.Player)
        robotSprite.setPosition(scene.screenWidth() / 2, scene.screenHeight() / 2 + 10);

        refreshRecycleOptions();
        spawnRecycleItem();
        userAgentCode();
    }

    function spawnRecycleItem() {
        // Clear any existing classification.
        robotState = {};

        for (let i = 0; i < RECYCLABLES_TO_SORT; i++) {
            const newItemType = recycleOptions._pickRandom()

            let newItem: RecycleSprite;
            if (newItemType == "sodaCan") {
                newItem = sprites.create(assets.image`sodaCan`, SpriteKind.Food) as RecycleSprite;
            } else if (newItemType == "note") {
                newItem = sprites.create(assets.image`note`, SpriteKind.Food) as RecycleSprite;
            } else {
                newItem = sprites.create(assets.image`waterBottle`, SpriteKind.Food) as RecycleSprite;
            }

            newItem.itemType = newItemType;
            newItem.setPosition(randint(20, scene.screenWidth() - 20), randint(20, scene.screenHeight() / 2 - 10));
            recyclableItems.push(newItem);
        }
    }
}
