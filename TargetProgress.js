var parameter = args.shortcutParameter.split("\n")
console.log(parameter)
const separate = "-------"
var reminders = await Reminder.allIncomplete()
var title = parameter[0]
var com_num = parseInt(parameter[1])
var goal_num = parseInt(parameter[2])
var new_note = " "
for(reminder of reminders)
{
    //if(reminder.priority>0)
    {
        console.log(reminder.title)
        var note = reminder.notes
        if (reminder.title == title)
        {
            //已经设立过目标，需要找到分割线
            if(!goal_num)
            {
                var list_obj = note.split(separate)
                note = list_obj[0].replace(/^\s+|\s+$/g,'')
                list_obj = list_obj[1].replace(/^\s+|\s+$/g,'').split("\n")
                var reg = /\d+/
                for(let i = 0;i < list_obj.length;i++)
                {
                    if(list_obj[i].indexOf("目标")!=-1)
                    {
                        goal_num = parseInt(reg.exec(list_obj[i]))
                        break;
                    }
                }
            }
            if(com_num < goal_num)
                reminder.isCompleted = false
            else
                reminder.isCompleted = true
            new_note = generate_str(goal_num,com_num)
            if(note)
                reminder.notes = note + "\n" + new_note
            else
                reminder.notes = new_note
            reminder.save()
            console.log(reminder.title+ " " +reminder.calendar.title+" 备注：\n" +reminder.notes)
        }
    }

}

Script.setShortcutOutput(new_note)
Script.complete()

function generate_str(goal_num,com_num)
{
    var goal_str = "⭐️目标---" + goal_num + "\n"
    var com_str = "✅完成---" + com_num +  "\n"
    //var per_str = "✅比例---" + Math.trunc(100*com_num/goal_num) + "%\n"
    var percent = Math.trunc(100*com_num/goal_num)
    var ten = Math.floor(percent/10)
    var one = percent%10
    var progress_bar = ""

    var i = 0
    for(;i < ten;i++)
        progress_bar+="🌕"
    if(i<10)
        if(one == 0 )
        {
            progress_bar  += "🌑"
        }
        else if(one < 3)
        {
            progress_bar += "🌘"
        }
        else if(one <= 6)
        {
            progress_bar += "🌗"
        }
        else
        {
            progress_bar +=  "🌖"
        }
    i++;
    for(;i < 10;i++)
        progress_bar+="🌑"
    return (separate + "\n" +  goal_str + com_str + progress_bar + " " + percent + "%")
}
