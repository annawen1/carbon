import React from 'react';
import { TileGroup, RadioTile, Stack } from '@carbon/react';
import { FeatureFlags } from '@carbon/feature-flags';

const TestComponent: React.FC = () => {
  return (
    //prettier-ignore
    (<div>
      {/* Case 1: Unwrapped TileGroup */}
      <FeatureFlags enableV12TileRadioIcons><TileGroup legend="TestGroup" name="test">
          <RadioTile id="test-1" value="test-1">
            Option 1
          </RadioTile>
          <RadioTile id="test-2" value="test-2">
            Option 2
          </RadioTile>
        </TileGroup></FeatureFlags>
      {/* Wrapped standalone missing flag prop */}
      <FeatureFlags enableV12TileRadioIcons>
        <TileGroup legend="Missing Attribute" name="wrapped">
          <RadioTile id="wrapped-1" value="wrapped-1">
            Already Wrapped Option 1
          </RadioTile>
          <RadioTile id="wrapped-2" value="wrapped-2">
            Already Wrapped Option 2
          </RadioTile>
        </TileGroup>
      </FeatureFlags>
      {/* Case 3: Already wrapped with other flags */}
      <FeatureFlags enable-v12-tile-default-icons enableV12TileRadioIcons>
        <TileGroup legend="Other Attribute" name="other-wrapped">
          <RadioTile id="other-1" value="other-1">
            Other Flag Option 1
          </RadioTile>
        </TileGroup>
      </FeatureFlags>
      {/* Case 4: Already wrapped with correct flag */}
      <FeatureFlags enableV12TileRadioIcons>
        <TileGroup legend="Correct Wrapped" name="correct">
          <RadioTile id="correct-1" value="correct-1">
            Correctly Wrapped Option
          </RadioTile>
        </TileGroup>
      </FeatureFlags>
      {/* Case 5: Standalone RadioTiles with different scenarios */}
      <Stack>
        {/* Unwrapped standalone */}
        <FeatureFlags enableV12TileRadioIcons><RadioTile id="standalone" value="standalone">
            Standalone Tile
          </RadioTile></FeatureFlags>
        {/* Wrapped standalone missing flag prop */}
        <FeatureFlags enableV12TileRadioIcons>
          <RadioTile id="wrapped-standalone" value="wrapped-standalone">
            Wrapped Standalone
          </RadioTile>
        </FeatureFlags>
        {/* Wrapped standalone with other flag */}
        <FeatureFlags enable-v12-tile-default-icons enableV12TileRadioIcons>
          <RadioTile id="other-standalone" value="other-standalone">
            Other Flag Standalone radio
          </RadioTile>
        </FeatureFlags>
        {/* Correctly wrapped standalone */}
        <FeatureFlags enableV12TileRadioIcons>
          <RadioTile id="correct-standalone" value="correct-standalone">
            Correct Standalone
          </RadioTile>
        </FeatureFlags>
      </Stack>
      {/* Case 6: Nested structures */}
      <div className="nested">
        <FeatureFlags enableV12TileRadioIcons><TileGroup legend="Nested Group" name="nested">
            <div className="wrapper">
              <RadioTile id="nested-1" value="nested-1">
                Nested Option 1
              </RadioTile>
            </div>
            <RadioTile id="nested-2" value="nested-2">
              Nested Option 2
            </RadioTile>
          </TileGroup></FeatureFlags>
      </div>
    </div>)
  );
};

export default TestComponent;
