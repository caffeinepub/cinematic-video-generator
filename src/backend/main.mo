import Text "mo:core/Text";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Outcall "./http-outcalls/outcall";

actor {

  public type VideoRecord = {
    id : Nat;
    prompt : Text;
    aspectRatio : Text;
    videoUrl : Text;
    createdAt : Int;
  };

  var falKey : Text = "";
  var nextId : Nat = 0;
  var videoHistory : [VideoRecord] = [];

  public func setFalKey(key : Text) : async () {
    falKey := key;
  };

  public query func hasFalKey() : async Bool {
    falKey != "";
  };

  func isSafe(prompt : Text) : Bool {
    let lower = prompt.toLower();
    if (lower.contains(#text "violence")) return false;
    if (lower.contains(#text "nsfw")) return false;
    if (lower.contains(#text "political figure")) return false;
    true;
  };

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  func extractJsonString(json : Text, field : Text) : ?Text {
    let needle = "\"" # field # "\":\"";
    let parts = json.split(#text needle);
    var count = 0;
    var after = "";
    for (part in parts) {
      if (count == 1) { after := part };
      count += 1;
    };
    if (count < 2) return null;
    let valueParts = after.split(#text "\"");
    var i = 0;
    var result = "";
    for (p in valueParts) {
      if (i == 0) { result := p };
      i += 1;
    };
    if (i == 0) null else ?result;
  };

  public func generateVideo(prompt : Text, aspectRatio : Text) : async { #ok : VideoRecord; #err : Text } {
    if (not isSafe(prompt)) {
      return #err("Safety Guardrail: Unsafe content detected.");
    };
    if (falKey == "") {
      return #err("FAL API key not configured.");
    };

    let authHeader : Outcall.Header = { name = "Authorization"; value = "Key " # falKey };
    let ctHeader : Outcall.Header = { name = "Content-Type"; value = "application/json" };

    let body = "{\"prompt\":\"" # prompt # "\",\"aspect_ratio\":\"" # aspectRatio # "\",\"duration\":\"10\",\"resolution\":\"1080p\"}";

    let queueResp = try {
      await Outcall.httpPostRequest(
        "https://queue.fal.run/fal-ai/ltx-video",
        [authHeader, ctHeader],
        body,
        transform,
      );
    } catch (_) {
      return #err("Failed to submit generation request.");
    };

    let requestId = switch (extractJsonString(queueResp, "request_id")) {
      case (null) { return #err("Could not parse request_id.") };
      case (?id) { id };
    };

    let resultResp = try {
      await Outcall.httpGetRequest(
        "https://queue.fal.run/fal-ai/ltx-video/requests/" # requestId,
        [authHeader],
        transform,
      );
    } catch (_) {
      return #err("Failed to fetch video result.");
    };

    let videoUrl = switch (extractJsonString(resultResp, "url")) {
      case (null) { return #err("Could not parse video URL.") };
      case (?u) { u };
    };

    let record : VideoRecord = {
      id = nextId;
      prompt;
      aspectRatio;
      videoUrl;
      createdAt = Time.now();
    };

    nextId += 1;
    videoHistory := videoHistory.concat([record]);

    #ok(record);
  };

  public query func getHistory() : async [VideoRecord] {
    let size = videoHistory.size();
    Array.tabulate<VideoRecord>(size, func(i) = videoHistory[size - 1 - i]);
  };
};
