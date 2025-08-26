module Slack
  class InteractivityController < SlackpplicationController
    ACCEPTABLE_TYPES = %w(message_action)

    def create
      return nope unless ACCEPTABLE_TYPES.include?(interaction_data[:type])
      send("handle_#{interaction_data[:type]}")
    end

    rescue_from StandardError do |e|
      _respond(text: "oh no! #{e.message} (#{e.class}) in #{e.backtrace.first}")
    end

    private

    def message_action_claim_scene
      unless current_user&.is_admin?
        _respond(text: "just who do you think you are?")
        return
      end

      unless interaction_data.dig(:channel, :id) == SlackService::CHAN
        _respond(text: "hmm, consider trying this in <##{SlackService::CHAN}>?")
        return
      end

      if interaction_data.dig(:message, :thread_ts) == interaction_data.dig(:message, :ts)
        _respond(text: "this is not a thread reply.")
        return
      end

      @scene = Scene.find_by(thread_ts: interaction_data.dig(:message, :thread_ts))
      @worthy_individual = User.find_by(slack_id: interaction_data.dig(:message, :user))

      if @scene.nil?
        _respond(text: "no scene found for parent message!")
        return
      end

      if @scene.claimed?
        _respond(text: "scene ##{@scene.id} (_#{@scene.name}_) already claimed by _#{@scene.user.display_name}_!\nyou can undo this <#{admin_scene_url(@scene)}|here>.")
        return
      end

      if @worthy_individual.nil?
        _respond(text: "no SoM user found for #{interaction_data.dig(:message, :user).inspect}? wtf!")
        return
      end

      @scene.claim!(@worthy_individual)
      _respond(text: "scene ##{@scene.id} (_<#{admin_scene_url(@scene)}|#{@scene.name}>_) claimed for _#{@worthy_individual.display_name}_!")
    end

    ###

    VALID_MESSAGE_ACTIONS = %w(claim_scene)

    def handle_message_action
      return nope unless VALID_MESSAGE_ACTIONS.include?(interaction_data[:callback_id])
      send("message_action_#{interaction_data[:callback_id]}")
    end

    def interaction_data
      @interaction_data ||= JSON.parse(params.require(:payload), symbolize_names: true)
    end

    def current_user
      @current_user ||= User.find_by(slack_id: interaction_data.dig(:user, :id))
    end

    def nope = render json: { error: "lol wut" }, status: :unprocessable_entity

    def _respond(content = {})
      unless content[:response_type]
        content[:response_type] = "ephemeral"
      end

      Faraday.post(interaction_data[:response_url]) do |req|
        req.headers["Content-Type"] = "application/json"
        req.body = content.to_json
      end
    end
  end
end
