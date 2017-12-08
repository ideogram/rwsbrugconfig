import xml.dom.minidom as minidom
import glob, os
import uuid


for file in glob.glob("../assets/*.svg"):

    dom = minidom.parse(file)

    node = dom.childNodes[0]

    if node.hasAttribute("data-type"):
        node.removeAttribute("data-type")

    title = dom.getElementsByTagName("title")[0]

    filename = os.path.splitext(file)[0]
    filename = filename.replace("../assets/","")

    title.firstChild.replaceWholeText(filename)

    file_handle = open("../assets/"+file ,"w+")
    dom.documentElement.writexml(file_handle)
    file_handle.close()