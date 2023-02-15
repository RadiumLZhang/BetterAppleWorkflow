
const reminder_hyperlink_prefix = '[id]x-apple-reminderkit://REMCDReminder/'
const reminder_hyperlink_reg_pattern = /\[id\]x\-apple\-reminderkit\:\/\/REMCDReminder\/[0-9A-F\-]+/

var dur_month = 1
const startDate = new Date()

// start date
startDate.setMonth(startDate.getMonth() - dur_month)
console.log(`start date: ${startDate.toLocaleDateString()}.`)

// end date
const endDate = new Date()
endDate.setMonth(endDate.getMonth() + dur_month)
console.log(`end date: ${endDate.toLocaleDateString()}.`)

// find all reminders due between start and end date
const reminders = await Reminder.allDueBetween(startDate, endDate)
console.log(`# reminders = ${reminders.length}`)

// fetch all calendars for events
var calendar = await Calendar.forEvents()

// create a dictionary of calendars: key is the title of calendar, value is the calendar
var m_dict = {}
for (cal of calendar) {
    m_dict[cal.title] = cal
    //console.log(`calendar:${cal.title}`)
}

// find all events between start and end date
const events = await CalendarEvent.between(startDate, endDate, calendar)
console.log(`# events = ${events.length}`)

// create a set of reminders' identifier
var reminders_id_set = new Set(reminders.map(e => e.identifier))
//for(let i of reminders_id_set) console.log(i)

// [1] iterate all events, if the event is created by this script, then delete the event if the reminder is not in the set
events_created = events.filter(e => e.notes != null && e.notes.includes("[id]"))

for (let event of events_created) {
    //console.warn(event.notes)
    //hyperlinks use for jumping to the reminder from the event
    let r = event.notes.match(reminder_hyperlink_reg_pattern)[0].replace(reminder_hyperlink_prefix, "")
    //console.log(r)
    // check if the reminder linked to the event is in the set: if not in the set, then delete the event
    if (!reminders_id_set.has(r)) {
        console.warn(`delete the event: 【${event.name}】`)
        event.remove()
    }
}


// [2] iterate all reminders, if the reminder is not in the set, then create a new event
for (const reminder of reminders) {
    const reminder_hyperlink = reminder_hyperlink_prefix + reminder.identifier
    // find the event linked to the reminder
    const [targetEvent] = events.filter(e => e.notes != null && e.notes.includes(reminder_hyperlink))
    //过滤重复提醒事项
    if (!m_dict[reminder.calendar.title]) {
        console.warn("Cannot find the calendar linked to the reminder" + reminder.calendar.title)
        continue
    }
    if (targetEvent) {
        //console.log('找到已创建的事项${reminder.title}')
        updateEvent(targetEvent, reminder)
    } else {
        console.warn(`import reminder【${reminder.title}】to calendar as an event 【${reminder.calendar.title}】`)
        const newEvent = new CalendarEvent()
        const reminder_notes = reminder.notes ? reminder.notes : ""
        newEvent.notes = reminder_hyperlink + "\n" + reminder_notes
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
    rn = reminder.notes ? reminder.notes : ""
    if (en.replace(reminder_hyperlink_reg_pattern, "") != '\n' + rn) {
        const reminder_hyperlink = reminder_hyperlink_prefix + reminder.identifier
        event.notes = reminder_hyperlink + "\n" + rn
        console.warn(`update 【${event.title}】 notes: ${event.notes}`)
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

