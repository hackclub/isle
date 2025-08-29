module Scenecore
  class << self
    def import_from_json(text)
      data = JSON.parse(text, symbolize_names: true)
      data[:scenes].each do |scene|
        s = Scene.find_or_create_by(id: scene[:id])
        s.x, s.y = scene[:x], scene[:y]
        s.name = scene[:name]
        s.description = scene[:description]
        s.connections = scene[:connections]
        s.save!
      end
    end
  end
end
