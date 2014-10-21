class CreateUsers < ActiveRecord::Migration
  def change
    create_table :users do |t|
      t.string :name
      t.text :last_pic
      t.integer :pic_height
      t.belongs_to :room, index: true

      t.timestamps
    end
  end
end
