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

.. _MIT: https://github.com/lextudio/vscode-restructuredtext-pack/blob/master/LICENSE.txt


Extension Pack for PyEnSight
----------------------------
PyEnSight_ is a Python wrapper for EnSight_, the Ansys simulation postprocessor.
It supports Pythonic access to EnSight so that you communicate directly with it
from Python. With PyEnSight, you can perform these essential actions:

* Start a new EnSight session or connect to an existing one.
* Read simulation data from any supported solver output format into the session.
* Generate complex postprocessing results in a Pythonic fashion.
* Visualize the processed data, extract it, or get a widget to embed it in an external app.

By installing the PyEnSight Visual Studio Code Extension it is possible to
embed the PyEnSight renderable inside of Visual Studio Code via a WebView Panel.

License
----------------------------

MIT_