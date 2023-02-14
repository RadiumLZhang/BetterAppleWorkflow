
var dur_month = 1

const startDate = new Date()
// start date
startDate.setMonth(startDate.getMonth() - dur_month)
console.log(`日历的开始时间${startDate.toLocaleDateString()}`)

// end date
const endDate = new Date()
endDate.setMonth(endDate.getMonth() + dur_month)
console.log(`日历的结束时间${endDate.toLocaleDateString()}`)

// find all reminders due between start and end date
const reminders = await Reminder.allDueBetween(startDate, endDate)
console.log(`获得${reminders.length}条提醒事项`)

// find all calendars
var calendar = await Calendar.forEvents()

// create a dictionary of calendars
var m_dict = {}
for (cal of calendar) {
    m_dict[cal.title] = cal
    //console.log(`calendar:${cal.title}`)
}

// find all events between start and end date
const events = await CalendarEvent.between(startDate, endDate, calendar)
console.log(`获得${events.length}条日历`)

// create a set of reminders' identifier
var reminders_id_set = new Set(reminders.map(e => e.identifier))
//for(let i of reminders_id_set) console.log(i)

// [1] delete events that are not in reminders
events_created = events.filter(e => e.notes != null && e.notes.includes("[id]"))
reg = /\[id\]x\-apple\-reminderkit\:\/\/REMCDReminder\/[0-9A-F\-]+/
for (let event of events_created) {
    //console.warn(event.notes)
    //日历事件备注event.notes通过targetNote包含的提醒事项id与提醒事项建立可跳转的超链接
    let r = event.notes.match(reg)[0].replace(/\[id\]x\-apple\-reminderkit\:\/\/REMCDReminder\//, "")
    //将日历事件备注中除id外的字符删去
    console.log(r)
    //判断日历事件备注链接中的id是否在提醒事项id集合中，若不在则删除此事件
    if (!reminders_id_set.has(r)) {
        console.warn(`删除事件【${event.name}】`)
        event.remove()
    }
}


for (const reminder of reminders) {
    //reminder的标识符
    const targetNote = `[id]x-apple-reminderkit://REMCDReminder/${reminder.identifier}`
    //获取reminder的id，便于在日历中跳转
    const [targetEvent] = events.filter(e => e.notes != null && e.notes.includes(targetNote))
    //过滤重复提醒事项
    if (!m_dict[reminder.calendar.title]) {
        console.warn("找不到日历" + reminder.calendar.title)
        continue
    }
    if (targetEvent) {
        //console.log('找到已创建的事项${reminder.title}')
        updateEvent(targetEvent, reminder)
    } else {
        console.warn(`创建提醒【${reminder.title}】到日历【${reminder.calendar.title}】`)
        const newEvent = new CalendarEvent()
        const n = reminder.notes
        newEvent.notes = targetNote + "\n" + (n ? n : "")
        //利用三目运算符添加备注内容
        updateEvent(newEvent, reminder)
    }
}

Script.complete()

/** function definitions **/

// update event with reminder
function updateEvent(event, reminder) {
    event.title = `${reminder.title}`
    cal_name = reminder.calendar.title
    cal = m_dict[cal_name]
    event.calendar = cal
    en = event.notes
    rn = reminder.notes
    //console.warn(event.calendar.title)
    //更新日历的备注
    rn = (rn ? rn : "") //防止rn出现[undefined]类型错误，保证rn为字符串

    if (en.replace(/\[id\]x\-apple\-reminderkit\:\/\/REMCDReminder\/[0-9A-F\-]+/, "") != '\n' + rn) {
        const targetNote = `[id]x-apple-reminderkit://REMCDReminder/${reminder.identifier}`
        event.notes = targetNote + "\n" + rn
        console.warn(`更新事件${event.title}备注`)
    }

    // [1] finished reminder
    if (reminder.isCompleted) {
        event.title = `✅${reminder.title}`
        event.isAllDay = false
        event.startDate = reminder.dueDate
        event.endDate = reminder.dueDate
        var period = (reminder.dueDate - reminder.completionDate) / 100 / 3600 / 24
        if (period < 0) {
            period = period / 10
        }
        period = period.toFixed(1)
        if (period < 0) {
            period = -period
            event.location = "延期" + period + "天完成"
        } else if (period == 0) {
            event.location = "准时完成"
        } else {
            event.location = "提前" + period + "天完成"
        }
    }
    // [2] unfinished reminder
    else {
        const nowtime = new Date()
        var period = (reminder.dueDate - nowtime) / 1000 / 3600 / 24
        period = period.toFixed(1)
        //console.log(reminder.title+(period))
        // [2.1] overdue reminder
        if (period < 0) {
            // delay the reminder
            event.location = "延期" + (-period) + "天"
            //如果不在同一天，设置为全天事项
            // not in the same day, set as all day event
            if (reminder.dueDate.getDate() != nowtime.getDate()) {
                event.title = `❌${reminder.title}`
                event.startDate = nowtime
                event.endDate = nowtime
                event.isAllDay = true
            }
            // in the same day, set as normal event
            else {
                event.title = `⭕️${reminder.title}`
                event.isAllDay = false
                event.startDate = reminder.dueDate
                var ending = new Date(reminder.dueDate)
                ending.setHours(ending.getHours() + 1)
                event.endDate = ending
            }
            console.log(`待办【${reminder.title}】顺延${-period}天`)
        }
        // [2.2] normal reminder
        else {
            event.title = `${reminder.title}`
            event.isAllDay = false
            event.location = "还剩" + period + "天"
            event.startDate = reminder.dueDate
            var ending = new Date(reminder.dueDate)
            ending.setHours(ending.getHours()) + 1
            event.endDate = ending
        }
    }
    if (!reminder.dueDateIncludesTime) {
        event.isAllDay = true
    }
    event.save()
}
