/*MT*
    
    MediaTomb - http://www.mediatomb.org/
    
    tree.js - this file is part of MediaTomb.
    
    Copyright (C) 2005 Gena Batyan <bgeradz@mediatomb.org>,
                       Sergey Bostandzhyan <jin@mediatomb.org>
    Copyright (C) 2006 Gena Batyan <bgeradz@mediatomb.org>,
                       Sergey Bostandzhyan <jin@mediatomb.org>,
                       Leonhard Wimmer <leo@mediatomb.org>
    
    MediaTomb is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.
    
    MediaTomb is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    
    You should have received a copy of the GNU General Public License
    along with MediaTomb; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
    
    $Id$
*/

var imagePath = '/icons/nanotree/images/';
var closedPNG = imagePath + 'folder_closed.png';
var openPNG = imagePath + 'folder_open.png';
var iconArray = new Array(closedPNG,openPNG);
var autoscanClosedPNG = imagePath + 'autoscan_folder_closed.png';
var autoscanOpenPNG = imagePath + 'autoscan_folder_open.png';
var autoscanIconArray = new Array(autoscanClosedPNG,autoscanOpenPNG);
var lastNodeDb = 'd0';
var lastNodeFs = 'f0';
var lastNodeDbWish;
var lastNodeFsWish;

sortNodes = false;
showRootNode = false;

var dbStuff =
{
    container: false,
    rootNode: false,
    treeShown: false,
    tombRootNode: false
};
var fsStuff =
{
    container: false,
    rootNode: false,
    treeShown: false,
    tombRootNode: false
};

function treeInit()
{
    treeDocument = frames["leftF"].document;
    treeWindow = frames["leftF"].window;
    
    documentID = "mediatombUI";
    
    var rootContainer = treeDocument.getElementById('treeDiv');
    dbStuff.container = treeDocument.createElement("div");
    fsStuff.container = treeDocument.createElement("div");
    
    Element.hide(dbStuff.container);
    Element.hide(fsStuff.container);
    rootContainer.appendChild(dbStuff.container);
    rootContainer.appendChild(fsStuff.container);
    
    dbStuff.rootNode = new TreeNode(-1,"Database", iconArray);
    dbStuff.tombRootNode = new TreeNode('d0', "Database", iconArray);
    dbStuff.tombRootNode.setHasChildren(true);
    dbStuff.tombRootNode.addOpenEventListener("openEventListener");
    dbStuff.rootNode.addChild(dbStuff.tombRootNode);
    //writeStates('d0','open');
    fsStuff.rootNode = new TreeNode(-2,"Filesystem", iconArray);
    fsStuff.tombRootNode = new TreeNode('f0', "Filesystem", iconArray);
    fsStuff.tombRootNode.setHasChildren(true);
    fsStuff.tombRootNode.addOpenEventListener("openEventListener");
    fsStuff.rootNode.addChild(fsStuff.tombRootNode);
    //writeStates('f0','open');
    treeChangeType();
    treeDocument.onkeydown = keyDown;
}

function updateTreeAfterLogin()
{
    if (isTypeDb() && getState(dbStuff.tombRootNode.getID()) == "open") fetchChildren(dbStuff.tombRootNode);
    if (!isTypeDb() && getState(fsStuff.tombRootNode.getID()) == "open") fetchChildren(fsStuff.tombRootNode);
    selectLastNode();
}

function treeChangeType()
{
    var type = isTypeDb() ? dbStuff : fsStuff; 
    var newContainer = type.container;
    if (container != newContainer)
    {
        if (container)
        {
            Element.hide(container);
        }
        container = newContainer;
        Element.show(container);
        rootNode = type.rootNode;
    }
    if (!type.treeShown)
    {
        readStates();
        if (isTypeDb())
        {
            writeStates('d0','open');
            //refreshNode(getTreeNode('d0'));
        }
        else
        {
            writeStates('f0','open');
            //refreshNode(getTreeNode('f0'));
        }
        showTree('/icons/nanotree/');
        type.treeShown = true;
    }
    if (loggedIn) selectLastNode();
}

function selectLastNode()
{
    if (isTypeDb())
    {
        var saveLastNodeDbWish = lastNodeDbWish;
        if (lastNodeDb) selectNode(lastNodeDb);
        lastNodeDbWish = saveLastNodeDbWish
    }
    else
    {
        var saveLastNodeFsWish = lastNodeFsWish;
        if (lastNodeFs) selectNode(lastNodeFs);
        lastNodeFsWish = saveLastNodeFsWish
    }
}

function standardClick(treeNode)
{
    var id = treeNode.getID();
    if (isTypeDb())
    {
        setCookie('lastNodeDb', id);
        lastNodeDb = id;
        lastNodeDbWish = null;
    }
    else
    {
        setCookie('lastNodeFs', id);
        lastNodeFs = id;
        lastNodeFsWish = null;
    }
    folderChange(id);
}

function openEventListener(id)
{
    var node = getTreeNode(id);
    if (!node.childrenHaveBeenFetched)
    {
        fetchChildren(node);
    }
}

function fetchChildren(node, uiUpdate)
{
    var id = node.getID();
    var type = id.substring(0, 1);
    id = id.substring(1);
    var linkType = (type == 'd') ? 'containers' : 'directories';
    var url = link(linkType, {parent_id: id});
    var async = ! uiUpdate;
    
    //DEBUG?
    //async = false;
    
    var myAjax = new Ajax.Request(
        url,
        {
            method: 'get',
            onComplete: updateTree,
            asynchronous: async,
        });
}

function updateTree(ajaxRequest)
{
    /*
    var xml = fetchXML(url);
    if (! xml)
    {
        alert("could not fetch XML - server not reachable?");
        return;
    }
    */
    
    var xml = ajaxRequest.responseXML;
    if (!errorCheck(xml)) return;
    
    var containers = xmlGetElement(xml, "containers");
    if (! containers)
    {
        alert("no containers tag found");
        return;
    }
    var type = xmlGetAttribute(containers, "type");
    var parentId = type+xmlGetAttribute(containers, "ofId");
    
    var node = getTreeNode(parentId);
    if (node.childrenHaveBeenFetched)
    {
        return;
    }
    var cts = containers.getElementsByTagName("container");
    if (! cts)
    {
        alert("no containers found");
        return;
    }
    
    var i;
    var len = cts.length;
    var selectNode = false;
    
    for (var i = 0; i < len; i++)
    {
        var c = cts[i];
        var id = type + xmlGetAttribute(c, "id");
        
        //TODO: childCount unnecessary? - hasChildren instead?
        var childCount = xmlGetAttribute(c, "childCount");
        if (childCount)
            childCount = parseInt(childCount);
        var expandable = childCount ? true : false;
        
        var autoscan = xmlGetAttribute(c, "autoscan");
        
        var title = xmlGetText(c);
        var child = new TreeNode(id, title, (autoscan ? autoscanIconArray: iconArray));
        
        //TODO:
        //child.setEditable(true);
        
        child.setHasChildren(expandable);
        node.addChild(child);
        child.addOpenEventListener("openEventListener");
        
        if (id == lastNodeDbWish)
        {
            lastNodeDbWish=null;
            lastNodeDb = id;
            selectNode = true;
        }
        else if (id == lastNodeFsWish)
        {
            lastNodeFsWish=null;
            lastNodeFs = id;
            selectNode = true;
        }
        
        //recurse immediately:
        //fetchChildren(openEventListener, child);
    }
    node.childrenHaveBeenFetched=true;
    refreshNode(node);
    if (selectNode) selectLastNode();
}

