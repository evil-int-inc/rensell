import Blob "mo:core/Blob";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import AccessControl "mo:caffeineai-authorization/access-control";
import Calls "mo:ic/Call";
import IC "mo:ic/Types";
import Properties "../types/properties";
import PropertiesLib "../lib/properties";
import RolesLib "../lib/roles";

mixin (
  accessControlState : AccessControl.AccessControlState,
  properties : Map.Map<Text, Properties.PropertyRecord>,
) {
  public query func listProperties(after : ?Text) : async [Properties.PropertyRecord] {
    PropertiesLib.list(properties, after, false);
  };

  public query ({ caller }) func listManagedProperties(after : ?Text) : async [Properties.PropertyRecord] {
    RolesLib.requireAdmin(accessControlState, caller);
    PropertiesLib.list(properties, after, true);
  };

  public shared ({ caller }) func saveProperty(property : Properties.PropertyRecord) : async () {
    RolesLib.requireAdmin(accessControlState, caller);
    PropertiesLib.save(properties, property);
  };

  public query func myHomeListingTransform(input : { context : Blob; response : IC.HttpRequestResult }) : async IC.HttpRequestResult {
    let { status; body } = input.response;
    { status; headers = []; body = if (status == 200) body else "" };
  };

  public shared ({ caller }) func readMyHomeListing(slug : Text) : async Text {
    RolesLib.requireAdmin(accessControlState, caller);
    if (slug.size() == 0 or slug.size() > 220) {
      Runtime.trap("Enter a valid MyHome listing URL.");
    };
    for (c in slug.chars()) {
      if (not ((c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or (c >= '0' and c <= '9') or c == '-')) {
        Runtime.trap("Enter a valid MyHome listing URL.");
      };
    };
    let parts = slug.split(#char '-').toArray();
    let id = parts[parts.size() - 1];
    if (parts.size() < 2 or id.size() == 0 or id.size() > 16 or id.startsWith(#text "0")) {
      Runtime.trap("Enter a valid MyHome listing URL.");
    };
    for (c in id.chars()) {
      if (c < '0' or c > '9') { Runtime.trap("Enter a valid MyHome listing URL.") };
    };

    let response = try {
      await Calls.httpRequest({
        url = "https://www.myhome.ge/en/real-estate/" # slug # "/";
        method = #get;
        max_response_bytes = ?1_000_000;
        body = null;
        headers = [{ name = "Accept"; value = "text/html" }, { name = "Accept-Encoding"; value = "identity" }];
        transform = ?{ function = myHomeListingTransform; context = "" };
        is_replicated = ?false;
      });
    } catch (_) {
      Runtime.trap("MyHome could not be reached. Import a saved HTML copy of the listing.");
    };
    RolesLib.requireAdmin(accessControlState, caller);
    if (response.status == 403 or response.status == 401) {
      Runtime.trap("MyHome blocked the direct request. Import a saved HTML copy of the listing.");
    };
    if (response.status != 200) {
      Runtime.trap("MyHome did not return this listing. Check the link or import a saved HTML copy.");
    };
    response.body.decodeUtf8() ?? Runtime.trap("MyHome returned an unreadable page.");
  };
};
