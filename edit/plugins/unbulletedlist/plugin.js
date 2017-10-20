//
// Developed by Erik at www.toolparadise.nl
//

// Add plugin
CKEDITOR.plugins.add("unbulletedlist", {
	init: function(editor) {

		// Add command
		editor.addCommand("toggleBullets", siteEditor.generateCommand({
			unbulletedClass: "no-bullets",
			exec: function(editor, page, selection) {
				var unorderedList = siteEditor.getParentFor(selection, "ul");
				if(unorderedList) {
					if(unorderedList.classed(this.unbulletedClass)) {
						unorderedList.classed(this.unbulletedClass, false);
					} else {
						unorderedList.classed(this.unbulletedClass, true);
					}
				}
			},
			refresh: function(editor, page, selection) {
				var unorderedList = siteEditor.getParentFor(selection, "ul");
				this.setState(unorderedList ?
					(unorderedList.classed(this.unbulletedClass) ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF) :
					CKEDITOR.TRISTATE_DISABLED
				);
			}
		}));

		// Add button
		editor.ui.addButton("ToggleBullets", {
			label: "Toggle bullets on list",
			command: "toggleBullets"
		});

		// Add icon (hack, don't want to recompile CKeditor because of dev-environment)
		editor.on("instanceReady", function() {
			d3.selectAll(".cke_button__togglebullets_icon")
				.style("background-image", "url('/edit/plugins/unbulletedlist/icons/unbulleted.png')")
				.style("background-size", "16px")
			;
		});
	}
});
