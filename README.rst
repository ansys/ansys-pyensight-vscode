PyEnSight Visual Studio Code Extension
======================================
|pyansys| |MIT| |ci|

.. |pyansys| image:: https://img.shields.io/badge/Py-Ansys-ffc107.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABDklEQVQ4jWNgoDfg5mD8vE7q/3bpVyskbW0sMRUwofHD7Dh5OBkZGBgW7/3W2tZpa2tLQEOyOzeEsfumlK2tbVpaGj4N6jIs1lpsDAwMJ278sveMY2BgCA0NFRISwqkhyQ1q/Nyd3zg4OBgYGNjZ2ePi4rB5loGBhZnhxTLJ/9ulv26Q4uVk1NXV/f///////69du4Zdg78lx//t0v+3S88rFISInD59GqIH2esIJ8G9O2/XVwhjzpw5EAam1xkkBJn/bJX+v1365hxxuCAfH9+3b9/+////48cPuNehNsS7cDEzMTAwMMzb+Q2u4dOnT2vWrMHu9ZtzxP9vl/69RVpCkBlZ3N7enoDXBwEAAA+YYitOilMVAAAAAElFTkSuQmCC
   :target: https://docs.pyansys.com/

.. |MIT| image:: https://img.shields.io/badge/License-MIT-yellow.svg
   :target: https://opensource.org/licenses/MIT

.. |ci| image:: https://github.com/ansys-internal/ansys-pyensight-vscode/actions/workflows/ci_cd.yml/badge.svg?branch=main
   :target: https://github.com/ansys-internal/ansys-pyensight-vscode/actions?query=branch%3Amain

.. |title| image:: https://s3.amazonaws.com/www3.ensight.com/build/media/pyensight_title.png

.. _EnSight: https://www.ansys.com/products/fluids/ansys-ensight

.. _PyEnSight: https://ensight.docs.pyansys.com/version/stable/

.. _MIT: https://github.com/ansys-internal/ansys-pyensight-vscode/blob/main/LICENSE

.. _VSCode: https://code.visualstudio.com/

.. _extension: https://marketplace.visualstudio.com/VSCode

.. _Python: https://marketplace.visualstudio.com/items?itemName=ms-python.python

.. _Install VSCode Extension: https://code.visualstudio.com/docs/editor/extension-marketplace

=============================================
PyEnSight extension for Visual Studio Code
=============================================
A VSCode_ extension_ which supports the PyEnSight_ PyAnsys module with Renderable embedding, augmented
hover links and snippets for empowering the writing and debugging of PyEnSight scripts.


Quick start
------------

* Install a PyEnSight_ supported version on your system.
* Install the PyEnSight extension for Visual Studio Code as described here: `Install VSCode Extension`_.
* If not set, set a default Python interpreter in VSCode using the command palette Python: Set Interpreter.

Features
---------

* String hovering in the text editor will show a link to the relevant PyEnSight_ documentation.
* A WebView can be launched during a Python debug session to select a specific session and Renderable to be displayed.
* Alternatively, users can launch a `PyEnSight Debug Session` that will launch a new Python debug session and let the user select the session and Renderable.
* Useful snippets are available to simplify the scripting experience.

PyEnSight WebView and Debug Session
------------------------------------

A PyEnSight debug session can be launched using the command palette "PyEnSight: Launch Debug Session".
The user will be asked to choose a Renderable to be chosen with the following options:

* image: A picture of the current EnSight status;
* deep_pixel: A deep pixel picture of the current EnSigth status;
* animation: A transient animation of the current dataset and status in EnSight;
* webgl: An embedded AVZ viewer showing the current status of EnSight exported in AVZ;
* remote: A VNC stream of the current EnSight rendering window with a simple webUI;
* remote_scene: A VNC stream to an EnVision instance showing the current status of EnSight exported as a scenario;
* webensight: (beta feature) A VNC stream of the current EnSight rendering window with a full webUI;

.. image:: images/pyensightremote.gif
   :width: 600

Following this choice, a standard Python Debug Session is launched. At the first breakpoint where at least a 
PyEnSight object is available on the stack frame, the user will be asked which Session to show. A panel
displaying the selected Renderable and Session will come up on the side, displaying the current status of the post-processing session.
Walking the script, the panel will get updated with the updated Renderable, so that the user can follow
what is happening in EnSight while debugging the script.

.. image:: images/pyensightsession.gif
   :width: 600

Alternatively, the panel can be launched after a Python debug session has been started, using the command palette "PyEnSight: Launch WebView".
The command should be always used when a breakpoint is hit and at least a Session object is available.

Both the commands are also available as option right clicking in the text editor, or in the run submenu on the top right of the VSCode UI.

Other commands
---------------

* PyEnSight: Open the PyEnSight documentation. The default browser is launched to display the PyEnSight documentation.
* PyEnSight: Open the EnSight Python API documentation. The default browser is launched to display the EnSight Python API documentation.
* PyEnSight: Help. An info window is displayed with the main PyEnSight extension features. Useful for checking the correct installation of the extension.
* PyEnSight: Install PyEnSight. The extension will detect the current selected Python interpreter and install PyEnSight. So make sure to use the correct interpreter.

Hovering
---------

Inside of the VSCode text editor, hovering any object is now possible to access the PyEnSight documentation link describing the object being hovered.

.. image:: images/hover.gif
   :width: 600



License
----------------------------

MIT_
