import xml.dom.minidom as minidom
import glob, os

# Illustrator can't export centre-alligned text as such.
# So, we don't output text at all and use this script
# to add a text-element in the center of each tile
# Don't forget to give 'draai.svg' an extra element manually

for file in glob.glob("../assets/*.svg"):

    dom = minidom.parse(file)

    node = dom.childNodes[0]

    if node.hasAttribute("width"):

        width = node.getAttribute("width")

        text = dom.createElement("text")
        text.setAttribute("x", str(int(width)/2))
        text.setAttribute("y", "465" )
        text.setAttribute("font-size", "24" )
        text.setAttribute("font-family", "RijksoverheidSansWebText-Bold, RijksoverheidSansWebText, sans-serif" )
        text.setAttribute("font-weight", "700")
        text.setAttribute("text-anchor", "middle")
        node.appendChild(text)

        file_handle = open("../assets/"+file ,"w+")
        dom.documentElement.writexml(file_handle)
        file_handle.close()