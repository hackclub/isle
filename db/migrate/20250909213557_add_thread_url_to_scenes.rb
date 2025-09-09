class AddThreadUrlToScenes < ActiveRecord::Migration[8.0]
  def change
    add_column :scenes, :thread_url, :string
  end
end
