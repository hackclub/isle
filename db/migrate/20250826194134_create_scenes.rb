class CreateScenes < ActiveRecord::Migration[8.0]
  def change
    create_table :scenes do |t|
      t.references :user, null: true, foreign_key: false
      t.decimal :x
      t.decimal :y
      t.string :name
      t.string :thread_ts

      t.timestamps
    end
  end
end
