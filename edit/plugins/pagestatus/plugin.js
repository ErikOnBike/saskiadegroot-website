//
// Developed by Erik at www.toolparadise.nl
//

// Add plugin
CKEDITOR.plugins.add("pagestatus", {
	init: function(editor) {

		// Add command
		editor.addCommand("showStatus", siteEditor.generateCommand({
			exec: function(editor, page, selection) {
				editor.openDialog("showStatusDialog");
			}
		}));

		// Add button
		editor.ui.addButton("Status", {
			label: "Status",
			command: "showStatus"
		});

		// Add icon (hack, don't want to recompile CKeditor because of dev-environment)
		editor.on("instanceReady", function() {
			d3.selectAll(".cke_button__status_icon")
				.style("background-image", "url('/edit/plugins/pagestatus/icons/status.png')")
				.style("background-size", "16px")
			;
		});

		// Add dialog
		CKEDITOR.dialog.add("showStatusDialog", function(editor) {
			return siteEditor.generateDialog({
				title: "Status",
				minWidth: 400,
				minHeight: 400,
				buttons: [ CKEDITOR.dialog.okButton ],
				contents: [
					{
						id: "tab-status",
						label: "Status",
						elements: [
							{
								type: "html",
								html: '<div class="component status-component"><b>The following pages have changes:</b><div class="page-list"></div></div>'
							}
						]
					}
				],
				onShow: function(editor, dialog, page, selection) {
					var ckeDialog = this;

					// Find changed pages
					var changedPages = siteEditor.getUnsavedPages();

					// Show changed pages
					dialog.select(".page-list").selectAll(".page-entry").remove();
					dialog.select(".page-list").selectAll(".page-entry").data(changedPages)
						.enter()
							.append("div")
								.attr("class", "page-entry")
								.text(function(d) { return pages.getName(d); })
								.on("click", function(d) {
									ckeDialog.hide();
									siteEditor.showPage(d, true);
								})
					;
				}
			});
		});
	}
});
