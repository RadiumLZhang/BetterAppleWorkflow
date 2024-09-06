// Calendar symbols
const originalSymbol = "💛";
const newSymbol = "❤️‍🔥";

// Fetch all calendars
const calendars = await Calendar.forEvents();
let specialCalendars = {};

// Find calendars with the "💛" symbol and their corresponding "❤️‍🔥" calendars
for (let cal of calendars) {
    if (cal.title.includes(originalSymbol)) {
        console.log(`Found Calendar: ${cal.title}`);
        const newCalendarTitle = cal.title.replace(originalSymbol, newSymbol);
        let newCalendar = calendars.find(c => c.title === newCalendarTitle);

        if (newCalendar) {
            specialCalendars[cal.title] = { original: cal, new: newCalendar };
        } else {
            console.log(`Error: Corresponding calendar "${newCalendarTitle}" not found. Please ensure it is pre-created.`);
        }
    }
}

// Function to fetch events from 1 month ago to all upcoming
async function fetchEvents(calendar) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // 1 month ago
    const endDate = new Date(2100, 0, 1);   // Arbitrary future end date
    return await CalendarEvent.between(startDate, endDate, [calendar]);
}

// Function to sync events between original and new calendar
async function syncCalendarEvents(originalCal, newCal) {
    const originalEvents = await fetchEvents(originalCal);
    const newEvents = await fetchEvents(newCal);

    // Create a map of new calendar events by their identifier
    const newEventMap = new Map();
    newEvents.forEach(event => newEventMap.set(event.notes, event));

    // Update or create events in the new calendar
    for (let event of originalEvents) {
        const eventId = event.notes || event.identifier;
        const matchingNewEvent = newEventMap.get(eventId);

        if (matchingNewEvent) {
            // Update the event if it already exists in the new calendar
            matchingNewEvent.title = event.title;
            matchingNewEvent.isAllDay = event.isAllDay;
            matchingNewEvent.startDate = event.startDate;
            matchingNewEvent.endDate = event.endDate;  // Ensure the endDate is the same
            matchingNewEvent.location = event.location;
            matchingNewEvent.notes = eventId;
            await matchingNewEvent.save();
            console.log(`Updated Event: ${event.title}`);
        } else {
            // Create a new event in the new calendar
            const newEvent = new CalendarEvent();
            newEvent.title = event.title;
            newEvent.isAllDay = event.isAllDay;
            newEvent.startDate = event.startDate;
            newEvent.endDate = event.endDate;  // Ensure the endDate is the same as the original
            newEvent.location = event.location;
            newEvent.notes = eventId;
            newEvent.calendar = newCal;
            await newEvent.save();
            console.log(`Created Event: ${event.title}`);
        }
    }

    // Delete events in the new calendar that no longer exist in the original calendar
    for (let newEvent of newEvents) {
        const eventId = newEvent.notes;
        const originalEventExists = originalEvents.some(event => (event.notes || event.identifier) === eventId);

        if (!originalEventExists) {
            await newEvent.remove();
            console.log(`Deleted Event: ${newEvent.title}`);
        }
    }
}

// Function to sync reminders with calendar events and update icons
async function syncRemindersWithEvents(calendar, reminderList) {
    const events = await fetchEvents(calendar);
    const today = new Date().setHours(0, 0, 0, 0); // Today's date at midnight

    // Create a map of reminders by their title without icons
    const reminderMap = new Map();
    reminderList.forEach(reminder => {
        const cleanTitle = reminder.title.replace(/^[✅⭕️❌☑️\s]+/, ''); // Remove any existing icons
        reminderMap.set(cleanTitle, reminder);
    });

    // Loop through events and ensure a corresponding reminder exists or is updated
    for (let event of events) {
        const cleanEventTitle = event.title.replace(/^[✅⭕️❌☑️\s]+/, ''); // Remove any existing icons and leading spaces
        console.log("cleanEventTitle: " + cleanEventTitle)
        let reminder = reminderMap.get(cleanEventTitle);

        // Determine the appropriate icon based on the due date and completeness
        let icon = '';
        const eventDate = new Date(event.startDate).setHours(0, 0, 0, 0);

        if (reminder && reminder.isCompleted) {
            icon = '✅';
        } else if (eventDate < today) {
            icon = '❌';
        } else if (eventDate === today) {
            icon = '⭕️';
        } else {
            icon = '☑️';
        }

        // Update or create the reminder with the correct icon
        if (reminder) {
            console.log("cleanEventTitle: " + cleanEventTitle)
            reminder.title = `${icon} ${cleanEventTitle}`;
            reminder.notes = event.notes || event.identifier;
            reminder.dueDate = event.startDate;

            // Update the event if the reminder is marked as completed
            if (reminder.isCompleted) {
                // use reminder due date and completed date to update the event
                var period = (reminder.dueDate - reminder.completionDate) / 1000 / 60 / 60 / 24 // in days
                if (period < 0) {
                    period = period / 10;
                }
                period = period.toFixed(1);
                if (period <= 0 && period > -1) {
                    event.notes = 'On time finished.';
                }
                else if (period < -1) {
                    event.notes = `Delay ${-period} day(s) finished.`;
                }
                else {
                    event.notes = `Finish ${period} day(s) early.`;
                }

                event.title = `${icon} ${cleanEventTitle}`;
                await event.save();
                console.log(`Updated Event: ${event.title} as completed.`);
            }

            // Add the event link to the reminder
            reminder.url = `x-apple-event://${event.identifier}`;
            await reminder.save();
            console.log(`Updated Reminder: ${reminder.title} with event link.`);
        } else {
            // Create a new reminder for the event if it doesn't exist
            reminder = new Reminder();
            reminder.title = `${icon} ${cleanEventTitle}`;
            reminder.notes = event.notes || event.identifier;
            reminder.dueDate = event.startDate;
            reminder.calendar = reminderList[0].calendar; // Use the calendar of the first reminder in the list

            // Add the event link to the new reminder
            reminder.url = `x-apple-event://${event.identifier}`;
            await reminder.save();
            console.log(`Created Reminder: ${reminder.title} with event link.`);
        }

        // Update the calendar event title with the appropriate icon
        event.title = `${icon} ${cleanEventTitle}`;
        await event.save();
        console.log(`Updated Event: ${event.title} with icon.`);
    }

    // Ensure all reminders correspond to an event in the calendar
    for (let reminder of reminderList) {
        const cleanReminderTitle = reminder.title.replace(/^[✅⭕️❌☑️\s]+/, '');
        const event = events.find(e => e.title.replace(/^[✅⭕️❌☑️\s]+/, '') === cleanReminderTitle);
        if (!event) {
            console.log(`Deleting unmatched reminder: ${reminder.title}`);
            await reminder.remove();
        }
    }
}


// Fetch reminders from the specific reminder list
async function fetchReminderList(listName) {
    const allReminders = await Reminder.all();
    return allReminders.filter(reminder => reminder.calendar.title === listName);
}

// Sync all special calendars
for (let [originalTitle, calObj] of Object.entries(specialCalendars)) {
    console.log(`Syncing Calendar: ${originalTitle} -> ${calObj.new.title}`);
    await syncCalendarEvents(calObj.original, calObj.new);

    // Fetch and sync reminders with the "❤️‍🔥Canvas" calendar
    const reminderListName = calObj.new.title;  // Assuming the reminder list has the same name as the calendar
    const reminderList = await fetchReminderList(reminderListName);

    console.log(`Syncing reminders with "${reminderListName}"`);
    await syncRemindersWithEvents(calObj.new, reminderList);
}

console.log("Calendar and Reminder sync complete!");
Script.complete();