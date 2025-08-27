class AddConnectionsToScenes < ActiveRecord::Migration[8.0]
  def change = add_column :scenes, :connections, :integer, array: true, default: []
end
