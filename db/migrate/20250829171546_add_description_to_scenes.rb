class AddDescriptionToScenes < ActiveRecord::Migration[8.0]
  def change
    add_column :scenes, :description, :text
  end
end
