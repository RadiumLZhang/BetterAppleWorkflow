events = await CalendarEvent.today()
var found = false
var count = 0

var m_dict = {
    "time":0,///
    "tomato":0,
    "detail":{}
}
var reg = /\d+/
var allDayevent = null
var cal = null

for (e of events)
{
    console.log(e.title)
    if(e.title.indexOf("⏰") != -1 || e.title.indexOf("♨️") != -1)
    {
        //console.log(e.title)
        e.remove()
    }
    if(e.title.indexOf("🍅") != -1 )
    {
        cal = e.calendar

        num = parseInt(reg.exec(e.notes))
        minute = (e.endDate-e.startDate)/1000/60
        m_dict["time"] += minute
        //m_dict["tomato"] += num

        if(!m_dict["detail"][e.title])
        {
            m_dict["detail"][e.title] = minute
        }
        else
        {
            m_dict["detail"][e.title]+= minute
        }
        //console.log(e.title+":" + num + "," + minute)
    }
    if(e.title=="🌈今日番茄统计")
    {
        found = true
        allDayevent=e
    }
}

if(!found)
{
    allDayevent = new CalendarEvent()
    allDayevent.title = "🌈今日番茄统计"
    allDayevent.isAllDay = true
    //newEvent.save()
}
console.log(m_dict)
var str = ""
str+= "今日专注时长："+m_dict["time"]+"min\n"
tomato = Math.trunc(m_dict["time"]/20)
str+= "获得番茄数："+tomato+"个🍅\n"
str+= "详情🔎："+"\n"
for(item in m_dict["detail"])
{
    str+=item+"："+m_dict["detail"][item]+"min\n"
    //console.log(item)
}
console.log("\n"+str)
allDayevent.notes  =  str
if(cal)
{
    allDayevent.calendar= cal
    allDayevent.save()
}

Script.complete()