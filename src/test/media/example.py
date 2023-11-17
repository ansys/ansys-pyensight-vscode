import os


from ansys.pyensight.core import LocalLauncher, DockerLauncher
from ansys.pyensight.core import ensobjlist
from ansys.api.pyensight.ens_part import ENS_PART
from ansys.pyensight.core.enscontext import EnsContext

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ansys.api.pyensight.ens_globals import ENS_GLOBALS
    from ansys.api.pyensight.ensight_api import enums as _enums

os.environ["ANSYSLMD_LICENSE_FILE"]="1055@milflexlm1.ansys.com"
launcher = LocalLauncher(ansys_installation="D:\\Product-src", enable_rest_api=True)
#launcher = DockerLauncher("D:\\presentation", use_dev=True)
#launcher.pull()
root = "http://s3.amazonaws.com/www3.ensight.com/PyEnSight/ExampleData"
session = launcher.start()
session2 = launcher.start()
# Check that only one session is associated to a launcher
assert session == session2
session.load_example("waterbreak.ens", root=root)
# "Load" the utilsa modules
sn = session.ensight.utils.support.scoped_name
x = session.ensight.objs.core.PARTS[0].ACTIVE
x[0]

with sn(session.ensight.objs.core) as core, sn(session.ensight.objs.enums) as enums:
    #core: 'ENS_GLOBALS'
    #enums: '_enums'
    core.PARTS.set_attr(
        "ELTREPRESENTATION", enums.FULL
    )
    core.PARTS.set_attr(
        "SHADING", enums.SHAD_SMOOTH_REFINED
    )
views = session.ensight.utils.views
query = session.ensight.utils.query
export = session.ensight.utils.export
parts = session.ensight.utils.parts
init_state = session.capture_context()
init_state.save("init_state.ctxz")
views.set_view_direction(1, 1, 1, name="isometric")
selected = parts.select_parts_invert()
selected.set_attr("COLORBYPALETTE", "alpha1")
export.image("test.png")
export.image("test.tiff", enhanced=True)
export.animation("test.mp4", anim_type=export.ANIM_TYPE_SOLUTIONTIME)
iso_state = session.capture_context()
# Since no tags are supplied, all the parts are selected
parts.select_parts_by_tag().set_attr("VISIBLE", False)
session.restore_context(iso_state)
selected = parts.select_parts_by_dimension(2)
selected = parts.select_parts_by_dimension(3)
sn = session.ensight.utils.support.scoped_name
zclip_state = None
with sn(session.ensight) as ensight, sn(session.ensight.objs.core) as core:
    clip_default = core.DEFAULTPARTS[ensight.PART_CLIP_PLANE]
    clip = clip_default.createpart(name="XClip", sources=parts.select_parts_by_dimension(3))[0]
    attrs = []
    attrs.append(["MESHPLANE", ensight.objs.enums.MESH_SLICE_Z])  # Z axis
    attrs.append(["TOOL", ensight.objs.enums.CT_XYZ])  # XYZ Tool
    attrs.append(["VALUE", 0.55])  # Z value
    zclip = clip_default.createpart(name="ZClip", sources=clip)[0]
    query.create_distance(
        "zlip_query", query.DISTANCE_PART1D, [zclip], core.VARIABLES["p"][0], new_plotter=True
    )
zclip_state = session.capture_context()
# Change the view to test the view restoring
session.ensight.view_transf.rotate(-66.5934067, 1.71428561, 0)
session.ensight.view_transf.rotate(18.0219765, -31.6363659, 0)
session.ensight.view_transf.rotate(-4.83516455, 9.5064888, 0)
session.ensight.view_transf.zoom(0.740957975)
session.ensight.view_transf.zoom(0.792766333)
session.ensight.view_transf.translate(0.0719177574, 0.0678303316, 0)
parts.select_parts_by_tag().set_attr("VISIBLE", False)
session.ensight.view_transf.rotate(4.83516455, 3.42857122, 0)
views.restore_view("isometric")
session.restore_context(zclip_state)
temp_query = query.create_temporal(
    "temporal_query",
    query.TEMPORAL_XYZ,
    parts.select_parts_by_dimension(3),
    "alpha1",
    xyz=views.compute_model_centroid(),
    new_plotter=True,
)
print(temp_query.QUERY_DATA)
ctx = EnsContext()
ctx.load( "init_state.ctxz")
session.restore_context(ctx)
print("complete!")

idx = session.ensight.objs.enums.PART_PARTICLE_TRACE
def_part = session.ensight.objs.core.DEFAULTPARTS[idx]
newpart = def_part.createpart(sources=parts.select_parts_by_dimension(3), name="test")[0]
