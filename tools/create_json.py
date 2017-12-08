# Schrijft een JSON-opgemaakte lijst met de sluis-elementen naar STD-out

import xml.dom.minidom as minidom
import glob, os
import json

os.chdir("./assets")

print("[")
for file in glob.glob("*.svg"):
    filename = os.path.splitext(file)[0]
    a = "\"name\":" + "\"" + filename + "\","
    b = "\"deltay\": 0,"
    c = "\"top\":0,"
    d = "\"bottom\": 0,"
    e = "\"gate\": 0"
    print "{ " + a.ljust(30) + b.ljust(15) + c.ljust(15) + d.ljust(15) + e.ljust(10) + " },"

    print

    #     print ("{%s,%s,%s,%s}" % (a) (b) (c) (d))
    #     print("\t{\"name\":\"%s\",\"shift\":0}," % (filename))

print("]")