ai_recycle.onAgentRun(function () {
    while (ai_recycle.recyclablesExist()) {
        ai_recycle.goToItem()
        ai_recycle.classifyItem()
        ai_recycle.goToBin()
    }
})
